import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDoctor } from "@/lib/doctor";
import { logAuditEvent } from "@/lib/audit";

const ALLOWED_MODULES = ["lab", "ecg", "imaging", "prescription"] as const;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_MODALITIES = ["xray", "usg", "mri", "ct"];

export async function POST(request: Request) {
  const doctor = await getCurrentDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const formData = await request.formData();
  const caseId = String(formData.get("case_id") ?? "");
  const moduleType = String(formData.get("module_type") ?? "");
  const modality = formData.get("modality");
  const file = formData.get("file");

  if (!caseId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "case_id and file are required." },
      { status: 400 }
    );
  }
  if (!ALLOWED_MODULES.includes(moduleType as (typeof ALLOWED_MODULES)[number])) {
    return NextResponse.json({ error: "Invalid module_type." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPEG, PNG, or WebP files are supported." },
      { status: 400 }
    );
  }
  if (moduleType === "imaging" && !ALLOWED_MODALITIES.includes(String(modality))) {
    return NextResponse.json({ error: "A valid imaging modality is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const reportId = crypto.randomUUID();
  const extension = file.name.split(".").pop() || "bin";
  const filePath = `${caseId}/${reportId}/report.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("report-files")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    // RLS on storage.objects rejects this if the doctor doesn't own the case.
    return NextResponse.json({ error: uploadError.message }, { status: 403 });
  }

  const { error: insertError } = await supabase.from("reports").insert({
    id: reportId,
    case_id: caseId,
    module_type: moduleType,
    file_path: filePath,
    uploaded_by: doctor.id,
    modality: moduleType === "imaging" ? String(modality) : null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  await logAuditEvent({
    caseId,
    actorId: doctor.id,
    eventType: "report_uploaded",
    eventDetail: { report_id: reportId, module_type: moduleType },
  });

  return NextResponse.json({ report_id: reportId });
}
