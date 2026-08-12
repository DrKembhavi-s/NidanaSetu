import type { InterpretationModule, IntakeContext } from "./types";

export type LabDraft = {
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

export const labModule: InterpretationModule<LabDraft, Record<string, never>> = {
  tool: {
    name: "record_interpretation",
    description:
      "Record the structured lab report interpretation: extracted test values and a narrative summary tied to the patient's symptoms/history.",
    input_schema: {
      type: "object",
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
  },

  buildPromptText(intake: IntakeContext) {
    return [
      "Read this lab report and extract every test value you can find, flagging any outside its reference range.",
      "Patient context (from the doctor's intake for this case):",
      `- Age: ${intake.age_at_visit}`,
      `- Sex: ${intake.sex}`,
      `- Presenting symptoms: ${intake.symptoms}`,
      intake.history ? `- Relevant history: ${intake.history}` : "",
      "Write the narrative for the reviewing physician, tying findings back to the presenting symptoms where relevant. This is a draft for physician review, not a final diagnosis.",
    ]
      .filter(Boolean)
      .join("\n");
  },

  async afterGenerate(supabase, reportId, aiDraft) {
    if (aiDraft.lab_results.length === 0) return;
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
  },
};
