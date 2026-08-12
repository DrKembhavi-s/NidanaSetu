import { labModule } from "./lab";
import { ecgModule } from "./ecg";
import { imagingModule } from "./imaging";
import { prescriptionsModule } from "./prescriptions";
import type { InterpretationModule } from "./types";

export const MODULE_REGISTRY: Record<string, InterpretationModule> = {
  lab: labModule,
  ecg: ecgModule,
  imaging: imagingModule,
  prescription: prescriptionsModule,
};

export type { IntakeContext, InterpretationModule, SupabaseServerClient } from "./types";
export type { LabDraft } from "./lab";
export type { EcgDraft } from "./ecg";
export type { ImagingDraft, ImagingExtra } from "./imaging";
export type { PrescriptionsDraft, PrescriptionsExtra, PriorMedication } from "./prescriptions";
