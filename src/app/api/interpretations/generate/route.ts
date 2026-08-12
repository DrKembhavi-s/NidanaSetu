import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";
import { logAuditEvent } from "@/lib/audit";
import { getAnthropicClient, INTERPRETATION_MODEL } from "@/lib/anthropic/client";

const MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const LAB_INTERPRETATION_TOOL = {
  name: "record_interpretation",
  description:
    "Record the structured lab report interpretation: extracted test values and a narrative summary tied to the patient's symptoms/history.",
  input_schema: {
    type: "object" as const,
    properties: {
      narrative: {
        type: "string",
        description:
          "A clinical narrative summary of the lab results, tied to the patient's presenting symptoms and history. Written for a physician to review, not the patient.",
      },
      lab_results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            test_name: { type: "string" },
            value: { type: "string" },
            unit: { type: "string" },
            reference_low: { type: ["number", "null"] },
            reference_high: { type: ["number", "null"] },
            flag: { type: "string", enum: ["low", "high", "normal"] },
          },
          required: ["test_name", "value", "flag"],
        },
      },
    },
    required: ["narrative", "lab_results"],
  },
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
    .select("id, case_id, module_type, file_path")
    .eq("id", reportId)
    .single();

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  if (report.module_type !== "lab") {
    return NextResponse.json(
      { error: "Only the lab reports module supports generation in this phase." },
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
    tools: [LAB_INTERPRETATION_TOOL],
    tool_choice: { type: "tool", name: "record_interpretation" },
    messages: [
      {
        role: "user",
        content: [
          fileContentBlock,
          {
            type: "text",
            text: [
              "Read this lab report and extract every test value you can find, flagging any outside its reference range.",
              "Patient context (from the doctor's intake for this case):",
              `- Age: ${intake.age_at_visit}`,
              `- Sex: ${intake.sex}`,
              `- Presenting symptoms: ${intake.symptoms}`,
              intake.history ? `- Relevant history: ${intake.history}` : "",
              "Write the narrative for the reviewing physician, tying findings back to the presenting symptoms where relevant. This is a draft for physician review, not a final diagnosis.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "Model did not return structured output." }, { status: 502 });
  }

  const aiDraft = toolUse.input as {
    narrative: string;
    lab_results: {
      test_name: string;
      value: string;
      unit?: string;
      reference_low?: number | null;
      reference_high?: number | null;
      flag: "low" | "high" | "normal";
    }[];
  };

  if (aiDraft.lab_results.length > 0) {
    await supabase.from("lab_results").insert(
      aiDraft.lab_results.map((r) => ({
        report_id: reportId,
        test_name: r.test_name,
        value: r.value,
        unit: r.unit ?? null,
        reference_low: r.reference_low ?? null,
        reference_high: r.reference_high ?? null,
        flag: r.flag,
      }))
    );
  }

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
    eventDetail: { report_id: reportId, interpretation_id: interpretation.id },
  });

  return NextResponse.json({ interpretation_id: interpretation.id });
}
