-- Doctor clinic profile fields, captured at signup and editable via /profile.
-- Nullable/defensive: existing doctor rows won't have these set.
alter table public.doctors
  add column clinic_name text,
  add column speciality text,
  add column address text,
  add column phone text;
