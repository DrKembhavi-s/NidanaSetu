-- Private bucket for uploaded diagnostic report files (real patient health
-- data, so not public). Path convention: {case_id}/{report_id}/{filename}.
-- Storage RLS reuses public.owns_case() via the first path segment.

insert into storage.buckets (id, name, public)
values ('report-files', 'report-files', false)
on conflict (id) do nothing;

create policy report_files_select_own on storage.objects
  for select using (
    bucket_id = 'report-files'
    and public.owns_case((storage.foldername(name))[1]::uuid)
  );

create policy report_files_insert_own on storage.objects
  for insert with check (
    bucket_id = 'report-files'
    and public.owns_case((storage.foldername(name))[1]::uuid)
  );
