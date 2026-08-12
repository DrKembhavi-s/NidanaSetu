import type { InterpretationModule, IntakeContext } from "./types";

export type EcgDraft = {
  narrative: string;
  rate_bpm: number | null;
  rhythm: string;
  axis: string;
  intervals: {
    pr_ms: number | null;
    qrs_ms: number | null;
    qt_ms: number | null;
    qtc_ms: number | null;
  };
  abnormalities: string[];
};

export const ecgModule: InterpretationModule<EcgDraft, Record<string, never>> = {
  tool: {
    name: "record_interpretation",
    description:
      "Record the structured ECG interpretation: rate, rhythm, axis, interval cues, flagged abnormalities, and a narrative tied to the patient's symptoms/history.",
    input_schema: {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description:
            "A clinical narrative summary of the ECG trace, tied to the patient's presenting symptoms and history. Written for a physician to review, not the patient.",
        },
        rate_bpm: { type: ["number", "null"] },
        rhythm: { type: "string" },
        axis: { type: "string" },
        intervals: {
          type: "object",
          properties: {
            pr_ms: { type: ["number", "null"] },
            qrs_ms: { type: ["number", "null"] },
            qt_ms: { type: ["number", "null"] },
            qtc_ms: { type: ["number", "null"] },
          },
          required: ["pr_ms", "qrs_ms", "qt_ms", "qtc_ms"],
        },
        abnormalities: {
          type: "array",
          items: { type: "string" },
          description: "Any flagged abnormalities or cues worth physician attention.",
        },
      },
      required: ["narrative", "rate_bpm", "rhythm", "axis", "intervals", "abnormalities"],
    },
  },

  buildPromptText(intake: IntakeContext) {
    return [
      "Read this ECG trace image and assess rate, rhythm, axis, and interval cues (PR, QRS, QT/QTc), flagging any abnormalities.",
      "Patient context (from the doctor's intake for this case):",
      `- Age: ${intake.age_at_visit}`,
      `- Sex: ${intake.sex}`,
      `- Presenting symptoms: ${intake.symptoms}`,
      intake.history ? `- Relevant history: ${intake.history}` : "",
      "Write the narrative for the reviewing physician, tying findings back to presenting symptoms (e.g. chest pain, palpitations) where relevant. This is a draft for physician review, not a final diagnosis.",
    ]
      .filter(Boolean)
      .join("\n");
  },

  async afterGenerate() {
    // No side-table writes — ECG's structured data lives only in
    // interpretations.ai_draft/doctor_final.
  },
};
