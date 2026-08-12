-- NidanaSetu Phase 0 schema: doctors, patients, cases, intake, reports,
-- lab_results, interpretations, medications (stub), audit_log.
-- Everything lives in the `public` schema. RLS is enabled on every table;
-- cross-table lookups inside policies go through `security definer
-- language plpgsql stable` helper functions so Postgres can't inline them
-- and re-trigger the target table's own RLS (that inlining is what causes
-- policy recursion with plain `language sql` helpers).

create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  dob date,
  sex text check (sex in ('male', 'female', 'other')),
  external_patient_ref text, -- future MyVaidya patient mapping, unused for now
  created_by uuid not null references public.doctors(id),
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  doctor_id uuid not null references public.doctors(id),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table public.intake_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id),
  age_at_visit int,
  sex text check (sex in ('male', 'female', 'other')),
  weight_kg numeric,
  symptoms text,
  history text,
  completed boolean not null default false,
  entered_at timestamptz not null default now(),
  constraint intake_completed_requires_fields check (
    completed = false or (
      symptoms is not null and symptoms <> '' and
      age_at_visit is not null and
      sex is not null
    )
  )
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  module_type text not null check (module_type in ('lab', 'ecg', 'imaging', 'prescription')),
  file_path text not null,
  uploaded_by uuid not null references public.doctors(id),
  uploaded_at timestamptz not null default now()
);

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  test_name text not null,
  value text,
  unit text,
  reference_low numeric,
  reference_high numeric,
  flag text check (flag in ('low', 'high', 'normal')),
  created_at timestamptz not null default now()
);

create table public.interpretations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id),
  status text not null default 'draft' check (status in ('draft', 'signed_off')),
  ai_draft jsonb,
  doctor_final jsonb,
  model_used text,
  generated_at timestamptz,
  signed_off_by uuid references public.doctors(id),
  signed_off_at timestamptz
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  prescription_report_id uuid not null references public.reports(id),
  drug_name text not null,
  dose text,
  indications text,
  side_effects text,
  interaction_flags jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  actor_id uuid not null references public.doctors(id),
  event_type text not null,
  event_detail jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS helper functions
-- ============================================================

create or replace function public.current_doctor_id()
returns uuid as $$
declare result uuid;
begin
  select id into result from public.doctors where auth_user_id = auth.uid();
  return result;
end;
$$ language plpgsql security definer stable set search_path = public;

create or replace function public.owns_case(target_case_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.cases
    where id = target_case_id and doctor_id = public.current_doctor_id()
  );
end;
$$ language plpgsql security definer stable set search_path = public;

create or replace function public.case_id_of_report(target_report_id uuid)
returns uuid as $$
declare result uuid;
begin
  select case_id into result from public.reports where id = target_report_id;
  return result;
end;
$$ language plpgsql security definer stable set search_path = public;

create or replace function public.case_id_of_interpretation(target_interpretation_id uuid)
returns uuid as $$
declare result uuid;
begin
  select r.case_id into result
  from public.interpretations i
  join public.reports r on r.id = i.report_id
  where i.id = target_interpretation_id;
  return result;
end;
$$ language plpgsql security definer stable set search_path = public;

revoke execute on function public.current_doctor_id() from public, anon;
revoke execute on function public.owns_case(uuid) from public, anon;
revoke execute on function public.case_id_of_report(uuid) from public, anon;
revoke execute on function public.case_id_of_interpretation(uuid) from public, anon;
grant execute on function public.current_doctor_id() to authenticated;
grant execute on function public.owns_case(uuid) to authenticated;
grant execute on function public.case_id_of_report(uuid) to authenticated;
grant execute on function public.case_id_of_interpretation(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.cases enable row level security;
alter table public.intake_records enable row level security;
alter table public.reports enable row level security;
alter table public.lab_results enable row level security;
alter table public.interpretations enable row level security;
alter table public.medications enable row level security;
alter table public.audit_log enable row level security;

-- doctors: a doctor can read/update only their own row; insert happens via
-- the signup server action right after auth.signUp(), using the same
-- authenticated session (auth_user_id = auth.uid() at insert time).
create policy doctors_select_self on public.doctors
  for select using (auth_user_id = auth.uid());
create policy doctors_insert_self on public.doctors
  for insert with check (auth_user_id = auth.uid());
create policy doctors_update_self on public.doctors
  for update using (auth_user_id = auth.uid());

-- patients: visible/writable only to the doctor who created them.
create policy patients_select_own on public.patients
  for select using (created_by = public.current_doctor_id());
create policy patients_insert_own on public.patients
  for insert with check (created_by = public.current_doctor_id());
create policy patients_update_own on public.patients
  for update using (created_by = public.current_doctor_id());

-- cases: scoped to the owning doctor.
create policy cases_select_own on public.cases
  for select using (doctor_id = public.current_doctor_id());
create policy cases_insert_own on public.cases
  for insert with check (doctor_id = public.current_doctor_id());
create policy cases_update_own on public.cases
  for update using (doctor_id = public.current_doctor_id());

-- intake_records: scoped via owns_case().
create policy intake_select_own on public.intake_records
  for select using (public.owns_case(case_id));
create policy intake_insert_own on public.intake_records
  for insert with check (public.owns_case(case_id));
create policy intake_update_own on public.intake_records
  for update using (public.owns_case(case_id));

-- reports: scoped via owns_case().
create policy reports_select_own on public.reports
  for select using (public.owns_case(case_id));
create policy reports_insert_own on public.reports
  for insert with check (public.owns_case(case_id));

-- lab_results: scoped via the parent report's case.
create policy lab_results_select_own on public.lab_results
  for select using (public.owns_case(public.case_id_of_report(report_id)));
create policy lab_results_insert_own on public.lab_results
  for insert with check (public.owns_case(public.case_id_of_report(report_id)));

-- interpretations: scoped via the parent report's case.
create policy interpretations_select_own on public.interpretations
  for select using (public.owns_case(public.case_id_of_report(report_id)));
create policy interpretations_insert_own on public.interpretations
  for insert with check (public.owns_case(public.case_id_of_report(report_id)));
create policy interpretations_update_own on public.interpretations
  for update using (public.owns_case(public.case_id_of_report(report_id)));

-- medications: scoped via the parent (prescription) report's case.
create policy medications_select_own on public.medications
  for select using (public.owns_case(public.case_id_of_report(prescription_report_id)));
create policy medications_insert_own on public.medications
  for insert with check (public.owns_case(public.case_id_of_report(prescription_report_id)));

-- audit_log: append-only. Doctors can read and insert rows for their own
-- cases, but no update/delete policy exists for any role, so rows are
-- structurally immutable once written (not just by convention).
create policy audit_log_select_own on public.audit_log
  for select using (public.owns_case(case_id));
create policy audit_log_insert_own on public.audit_log
  for insert with check (public.owns_case(case_id) and actor_id = public.current_doctor_id());
