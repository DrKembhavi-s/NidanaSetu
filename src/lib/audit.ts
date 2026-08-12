import { createClient } from "@/lib/supabase/server";

export async function logAuditEvent(params: {
  caseId: string;
  actorId: string;
  eventType: string;
  eventDetail?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    case_id: params.caseId,
    actor_id: params.actorId,
    event_type: params.eventType,
    event_detail: params.eventDetail ?? null,
  });
}
