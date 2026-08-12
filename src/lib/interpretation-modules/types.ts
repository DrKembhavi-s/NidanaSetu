import type Anthropic from "@anthropic-ai/sdk";
import type { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type IntakeContext = {
  age_at_visit: number | null;
  sex: string | null;
  symptoms: string | null;
  history: string | null;
};

export interface InterpretationModule<TDraft = unknown, TExtra = unknown> {
  tool: Anthropic.Tool & { name: "record_interpretation" };
  buildPromptText(intake: IntakeContext, extra: TExtra): string;
  afterGenerate(
    supabase: SupabaseServerClient,
    reportId: string,
    aiDraft: TDraft
  ): Promise<void>;
}
