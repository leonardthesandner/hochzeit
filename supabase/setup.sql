-- Einrichtung der Gästefoto-Galerie
-- In Supabase unter "SQL Editor" einfügen und einmal ausführen.

-- Tabelle mit einem Eintrag pro Foto
create table public.fotos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  pfad text not null unique check (pfad ~ '^[0-9a-f-]{36}\.jpg$'),
  name text check (char_length(name) <= 60)
);

alter table public.fotos enable row level security;

-- Alle dürfen Fotos sehen und neue eintragen, aber nichts ändern oder löschen
create policy "Fotos ansehen" on public.fotos
  for select to anon, authenticated using (true);

create policy "Fotos eintragen" on public.fotos
  for insert to anon, authenticated with check (true);

-- Neue Fotos sofort an alle offenen Seiten schicken
alter publication supabase_realtime add table public.fotos;

-- Öffentlicher Speicher für die Bilder: nur JPEG, höchstens 10 MB pro Datei
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gaestefotos', 'gaestefotos', true, 10485760, array['image/jpeg']);

-- Hochladen erlaubt, Überschreiben und Löschen nicht
create policy "Gästefotos hochladen" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'gaestefotos');
