import type { InterpretationModule, IntakeContext } from "./types";

export type DermatologyDraft = {
  narrative: string;
  lesion_description: {
    type: string;
    color: string;
    border: string;
    size_estimate: string;
    texture: string;
  };
  risk_impression: "likely_benign" | "indeterminate" | "suspicious_features_present";
  suspicious_features: string[];
  recommendation: string;
};

export const dermatologyModule: InterpretationModule<DermatologyDraft, Record<string, never>> = {
  tool: {
    name: "record_interpretation",
    description:
      "Record a structured, purely descriptive skin lesion assessment: morphological features, a risk-triage impression, and a recommendation — never a named diagnosis.",
    input_schema: {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description:
            "A descriptive summary of the lesion for the reviewing physician, tied to the patient's presenting symptoms/history. Describe only what is visible — never name a specific disease or diagnosis (no 'melanoma', 'basal cell carcinoma', etc.). Written for a physician to review, not the patient.",
        },
        lesion_description: {
          type: "object",
          description: "Purely morphological, non-diagnostic description of the lesion's appearance.",
          properties: {
            type: { type: "string", description: "e.g. macule, papule, nodule, plaque." },
            color: { type: "string" },
            border: { type: "string", description: "e.g. well-defined vs irregular/poorly-defined." },
            size_estimate: {
              type: "string",
              description: "Rough visual size estimate, noted as an estimate (no ruler in image).",
            },
            texture: { type: "string" },
          },
          required: ["type", "color", "border", "size_estimate", "texture"],
        },
        risk_impression: {
          type: "string",
          enum: ["likely_benign", "indeterminate", "suspicious_features_present"],
          description:
            "A triage bucket only, never a named condition. Choose conservatively — prefer 'indeterminate' over confident reassurance when uncertain.",
        },
        suspicious_features: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific observed morphological features driving the risk_impression (e.g. asymmetric shape, border irregularity, color variation within the lesion, diameter >6mm). Empty array when risk_impression is likely_benign.",
        },
        recommendation: {
          type: "string",
          description:
            "Always present. For indeterminate/suspicious_features_present: suggest dermatology referral, dermoscopy, or biopsy for confirmation. For likely_benign: a routine-monitoring note. Framed as a suggestion for the physician to act on, not an instruction — the physician makes the final call.",
        },
      },
      required: ["narrative", "lesion_description", "risk_impression", "suspicious_features", "recommendation"],
    },
  },

  buildPromptText(intake: IntakeContext) {
    return [
      "Look at this photo of a skin lesion and describe only what is visibly present — morphology (type, color, border, size estimate, texture).",
      "Do NOT name a specific diagnosis or disease (no 'melanoma', 'basal cell carcinoma', 'psoriasis', etc.) — this is strictly a descriptive, non-diagnostic assessment.",
      "Assign risk_impression as a triage bucket only (likely_benign / indeterminate / suspicious_features_present), choosing conservatively — prefer 'indeterminate' over confident reassurance when features are ambiguous.",
      "List the specific features (asymmetry, border irregularity, color variation, diameter, evolution if mentioned in history) that drove that impression in suspicious_features.",
      "Always give a recommendation: confirmatory testing/dermoscopy/biopsy/specialist referral if not clearly benign-appearing, or routine monitoring if it is.",
      "Patient context (from the doctor's intake for this case):",
      `- Age: ${intake.age_at_visit}`,
      `- Sex: ${intake.sex}`,
      `- Presenting symptoms: ${intake.symptoms}`,
      intake.history ? `- Relevant history: ${intake.history}` : "",
      "This is a draft for physician review, not a diagnosis — the physician decides what to do with it.",
    ]
      .filter(Boolean)
      .join("\n");
  },

  async afterGenerate() {
    // No side-table writes — dermatology's structured data lives only in
    // interpretations.ai_draft/doctor_final.
  },
};
