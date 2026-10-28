-- אגם מציירת: שמירה בענן על הפרויקט של החווה (xgqetnlsesgwiypufodf).
-- כל משתמשת רואה וכותבת רק את שלה.
create table if not exists public.draw_progress (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.draw_progress enable row level security;
drop policy if exists draw_progress_own on public.draw_progress;
create policy draw_progress_own on public.draw_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.drawings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id bigint not null,
  lesson_id text not null,
  title text not null,
  path text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.drawings enable row level security;
drop policy if exists drawings_select_own on public.drawings;
drop policy if exists drawings_insert_own on public.drawings;
drop policy if exists drawings_delete_own on public.drawings;
create policy drawings_select_own on public.drawings for select to authenticated using (user_id = auth.uid());
create policy drawings_insert_own on public.drawings for insert to authenticated with check (user_id = auth.uid());
create policy drawings_delete_own on public.drawings for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drawings', 'drawings', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists drawings_obj_select on storage.objects;
drop policy if exists drawings_obj_insert on storage.objects;
drop policy if exists drawings_obj_delete on storage.objects;
create policy drawings_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'drawings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy drawings_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'drawings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy drawings_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'drawings' and (storage.foldername(name))[1] = auth.uid()::text);
