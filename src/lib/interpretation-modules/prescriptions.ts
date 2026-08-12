import type { InterpretationModule, IntakeContext } from "./types";

export type PriorMedication = { drug_name: string; dose: string | null };
export type PrescriptionsExtra = { priorMedications: PriorMedication[] };

export type PrescriptionsDraft = {
  narrative: string;
  medications: {
    drug_name: string;
    normalized_name: string | null;
    dose: string | null;
    indications: string;
    side_effects: string;
    interaction_flags: string[];
  }[];
  symptom_cross_check: {
    symptom: string;
    possibly_related_drug: string;
    rationale: string;
  }[];
};

export const prescriptionsModule: InterpretationModule<PrescriptionsDraft, PrescriptionsExtra> = {
  tool: {
    name: "record_interpretation",
    description:
      "Record the structured prescription interpretation: normalized medications with indications/side-effects/interaction flags, a distinct symptom-vs-side-effect cross-check, and a narrative.",
    input_schema: {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description:
            "A clinical narrative summary of the prescription, tied to the patient's presenting symptoms and history. Written for a physician to review, not the patient.",
        },
        medications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              drug_name: { type: "string", description: "Drug name as written on the prescription." },
              normalized_name: {
                type: ["string", "null"],
                description: "Standard/generic name, if the written name differs (brand name, misspelling, abbreviation).",
              },
              dose: { type: ["string", "null"] },
              indications: { type: "string", description: "What this drug is typically used for." },
              side_effects: { type: "string", description: "Common/notable side effects." },
              interaction_flags: {
                type: "array",
                items: { type: "string" },
                description:
                  "Any interaction or duplication concerns against the patient's other current medications (listed in the prompt context) or against other drugs in this same prescription. Empty array if none.",
              },
            },
            required: ["drug_name", "normalized_name", "dose", "indications", "side_effects", "interaction_flags"],
          },
        },
        symptom_cross_check: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symptom: { type: "string", description: "A symptom from the patient's intake." },
              possibly_related_drug: { type: "string" },
              rationale: { type: "string" },
            },
            required: ["symptom", "possibly_related_drug", "rationale"],
          },
          description:
            "Distinct from the indication summary above: for each intake symptom that could plausibly be a side effect of a current medication, flag it here with the drug and rationale. Empty array if none plausible.",
        },
      },
      required: ["narrative", "medications", "symptom_cross_check"],
    },
  },

  buildPromptText(intake: IntakeContext, extra: PrescriptionsExtra) {
    const priorMedsText =
      extra.priorMedications.length > 0
        ? extra.priorMedications
            .map((m) => `- ${m.drug_name}${m.dose ? ` (${m.dose})` : ""}`)
            .join("\n")
        : "(none on record for this case)";

    return [
      "Read this prescription (handwritten or printed) and identify every medication and dose.",
      "For each medication, normalize the name if it's a brand name/abbreviation/misspelling, and give its typical indications and common side effects.",
      "Flag interaction or duplication concerns against both the patient's other current medications (listed below) and other drugs in this same prescription.",
      "The patient's other current medications on record for this case:",
      priorMedsText,
      "Patient context (from the doctor's intake for this case):",
      `- Age: ${intake.age_at_visit}`,
      `- Sex: ${intake.sex}`,
      `- Presenting symptoms: ${intake.symptoms}`,
      intake.history ? `- Relevant history: ${intake.history}` : "",
      "Separately, as a distinct cross-check (not part of the indication summary): for each presenting symptom above that could plausibly be a side effect of one of the current medications, flag it in symptom_cross_check with which drug and why. Leave it empty if nothing plausible applies.",
      "This is a draft for physician review, not a final medication plan.",
    ]
      .filter(Boolean)
      .join("\n");
  },

  async afterGenerate(supabase, reportId, aiDraft) {
    if (aiDraft.medications.length === 0) return;
    await supabase.from("medications").insert(
      aiDraft.medications.map((m) => ({
        prescription_report_id: reportId,
        drug_name: m.drug_name,
        dose: m.dose,
        indications: m.indications,
        side_effects: m.side_effects,
        interaction_flags: m.interaction_flags,
      }))
    );
  },
};
