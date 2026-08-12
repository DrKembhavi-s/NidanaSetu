import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";
import { logAuditEvent } from "@/lib/audit";
import { getAnthropicClient, INTERPRETATION_MODEL } from "@/lib/anthropic/client";
import { MODULE_REGISTRY } from "@/lib/interpretation-modules";

const MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function POST(request: Request) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reportId = body?.report_id as string | undefined;
  if (!reportId) {
    return NextResponse.json({ error: "report_id is required." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: report } = await supabase
    .from("reports")
    .select("id, case_id, module_type, file_path, modality")
    .eq("id", reportId)
    .single();

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const moduleConfig = MODULE_REGISTRY[report.module_type];
  if (!moduleConfig) {
    return NextResponse.json(
      { error: `No generation support for module "${report.module_type}".` },
      { status: 400 }
    );
  }

  // Mandatory intake gate, enforced server-side: no generation without a
  // linked, completed intake record for this report's case.
  const { data: intake } = await supabase
    .from("intake_records")
    .select("age_at_visit, sex, symptoms, history, completed")
    .eq("case_id", report.case_id)
    .maybeSingle();

  if (!intake || !intake.completed) {
    return NextResponse.json(
      { error: "intake_incomplete", message: "Complete the patient intake before generating an interpretation." },
      { status: 403 }
    );
  }

  // Idempotent: if a draft/signed-off interpretation already exists for
  // this report, just return it instead of regenerating.
  const { data: existing } = await supabase
    .from("interpretations")
    .select("id")
    .eq("report_id", reportId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ interpretation_id: existing.id });
  }

  // Module-specific extra prompt context.
  let extra: unknown = {};
  if (report.module_type === "imaging") {
    extra = { modality: report.modality ?? "unspecified" };
  } else if (report.module_type === "prescription") {
    const { data: priorMeds } = await supabase
      .from("medications")
      .select("drug_name, dose, prescription_report_id, reports!medications_prescription_report_id_fkey(case_id)")
      .neq("prescription_report_id", reportId);
    const sameCasePriorMeds = (priorMeds ?? []).filter((m) => {
      const r = Array.isArray(m.reports) ? m.reports[0] : m.reports;
      return r?.case_id === report.case_id;
    });
    extra = {
      priorMedications: sameCasePriorMeds.map((m) => ({ drug_name: m.drug_name, dose: m.dose })),
    };
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("report-files")
    .download(report.file_path);
  if (downloadError || !fileBlob) {
    return NextResponse.json(
      { error: downloadError?.message ?? "Could not read uploaded file." },
      { status: 500 }
    );
  }

  const extension = report.file_path.split(".").pop()?.toLowerCase() ?? "";
  const mediaType = MEDIA_TYPES[extension];
  if (!mediaType) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const fileContentBlock =
    mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: INTERPRETATION_MODEL,
    max_tokens: 4096,
    tools: [moduleConfig.tool],
    tool_choice: { type: "tool", name: "record_interpretation" },
    messages: [
      {
        role: "user",
        content: [fileContentBlock, { type: "text", text: moduleConfig.buildPromptText(intake, extra) }],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "Model did not return structured output." }, { status: 502 });
  }

  const aiDraft = toolUse.input;

  // Forced tool_choice makes the model call the tool, but doesn't guarantee
  // its input actually matches the schema shape — validate the one field
  // every module's schema requires before persisting anything.
  if (
    typeof aiDraft !== "object" ||
    aiDraft === null ||
    typeof (aiDraft as { narrative?: unknown }).narrative !== "string"
  ) {
    return NextResponse.json(
      { error: "Model returned malformed structured output. Try generating again." },
      { status: 502 }
    );
  }

  await moduleConfig.afterGenerate(supabase, reportId, aiDraft);

  const { data: interpretation, error: insertError } = await supabase
    .from("interpretations")
    .insert({
      report_id: reportId,
      status: "draft",
      ai_draft: aiDraft,
      model_used: INTERPRETATION_MODEL,
      generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !interpretation) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not save interpretation." },
      { status: 500 }
    );
  }

  await logAuditEvent({
    caseId: report.case_id,
    actorId: doctor.id,
    eventType: "interpretation_generated",
    eventDetail: { report_id: reportId, interpretation_id: interpretation.id, module_type: report.module_type },
  });

  return NextResponse.json({ interpretation_id: interpretation.id });
}
