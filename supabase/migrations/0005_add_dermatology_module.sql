-- Widen reports.module_type to allow 'dermatology'. Dynamically find and
-- drop the existing check constraint (whatever it's actually named) rather
-- than hardcoding the name, then re-add a clearly-named one.
do $$
declare con_name text;
begin
  select conname into con_name from pg_constraint
  where conrelid = 'public.reports'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%module_type%';
  if con_name is not null then
    execute format('alter table public.reports drop constraint %I', con_name);
  end if;
end $$;

alter table public.reports add constraint reports_module_type_check
  check (module_type in ('lab', 'ecg', 'imaging', 'prescription', 'dermatology'));
