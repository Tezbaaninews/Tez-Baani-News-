-- Run in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reader' check (role in ('reader','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 180),
  slug text not null unique,
  category text not null check (category in ('Breaking News','Punjab News','Haryana News','देश-दुनिया','स्थानीय खबरें')),
  summary text not null default '' check (char_length(summary) <= 400),
  body text not null,
  author text not null default 'Tez Baani News',
  image_url text,
  image_alt text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.profiles enable row level security;
alter table public.news enable row level security;
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "public reads published news" on public.news for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admins insert news" on public.news for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
create policy "admins update news" on public.news for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete news" on public.news for delete to authenticated using (public.is_admin());

-- Create a public Storage bucket for images. The bucket is public only for reading images;
-- uploads/deletes remain restricted to authenticated admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "public can view news images" on storage.objects for select to anon, authenticated
using (bucket_id = 'news-images');
create policy "admins upload news images to own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'news-images' and public.is_admin() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins update news images in own folder" on storage.objects for update to authenticated
using (bucket_id = 'news-images' and public.is_admin() and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'news-images' and public.is_admin() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins delete news images in own folder" on storage.objects for delete to authenticated
using (bucket_id = 'news-images' and public.is_admin() and (storage.foldername(name))[1] = auth.uid()::text);
