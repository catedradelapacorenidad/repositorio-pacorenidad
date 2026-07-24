create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  author text,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  public_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_category_idx
on public.documents (category);

create index if not exists documents_created_at_idx
on public.documents (created_at desc);

alter table public.documents enable row level security;

drop policy if exists "Lectura publica de documentos" on public.documents;

create policy "Lectura publica de documentos"
on public.documents
for select
using (true);
