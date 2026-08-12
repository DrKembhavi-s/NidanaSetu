import type { InterpretationModule, IntakeContext } from "./types";

export type ImagingExtra = { modality: string };

export type ImagingDraft = {
  narrative: string;
  observations: { finding: string; location: string | null }[];
};

const MODALITY_LABELS: Record<string, string> = {
  xray: "X-ray",
  usg: "ultrasound (USG)",
  mri: "MRI",
  ct: "CT",
};

export const imagingModule: InterpretationModule<ImagingDraft, ImagingExtra> = {
  tool: {
    name: "record_interpretation",
    description:
      "Record visible observations on this imaging study as items to verify, plus a narrative — not diagnostic conclusions.",
    input_schema: {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description:
            "A narrative summary of what is visible in the image, tied to the patient's presenting symptoms and history, framed as observations for physician verification — not a diagnosis. Written for a physician to review, not the patient.",
        },
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              finding: {
                type: "string",
                description: "A specific visible observation, described neutrally (not as a diagnosis).",
              },
              location: { type: ["string", "null"] },
            },
            required: ["finding", "location"],
          },
        },
      },
      required: ["narrative", "observations"],
    },
  },

  buildPromptText(intake: IntakeContext, extra: ImagingExtra) {
    const modalityLabel = MODALITY_LABELS[extra.modality] ?? extra.modality;
    return [
      `This is a ${modalityLabel} image. Describe only what is visibly present.`,
      "Do NOT state a diagnosis or a definitive conclusion — this is the highest-liability module in this tool. Frame every item as an observation the physician must independently verify, not a finding they should trust as-is.",
      "Patient context (from the doctor's intake for this case):",
      `- Age: ${intake.age_at_visit}`,
      `- Sex: ${intake.sex}`,
      `- Presenting symptoms: ${intake.symptoms}`,
      intake.history ? `- Relevant history: ${intake.history}` : "",
      "Write the narrative for the reviewing physician. This is a draft for physician review, not a final diagnosis.",
    ]
      .filter(Boolean)
      .join("\n");
  },

  async afterGenerate() {
    // No side-table writes — imaging's structured data lives only in
    // interpretations.ai_draft/doctor_final.
  },
};
