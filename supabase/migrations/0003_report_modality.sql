-- Imaging reports carry a doctor-selected modality (chosen at upload time,
-- not inferred by the model). Nullable — only populated for module_type='imaging'.
alter table public.reports
  add column modality text check (modality in ('xray', 'usg', 'mri', 'ct'));
