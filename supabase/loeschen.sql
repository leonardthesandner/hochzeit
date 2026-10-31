-- Löschen von Fotos vereinfachen
-- In Supabase unter "SQL Editor" einfügen und einmal ausführen.

-- Wird eine Bilddatei im Storage gelöscht, verschwindet auch ihr Eintrag in der Tabelle
-- und damit das Foto von der Website. Es reicht, die große Datei oder die _klein-Datei zu löschen.
create or replace function public.foto_eintrag_entfernen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.bucket_id = 'gaestefotos' then
    delete from public.fotos where pfad = regexp_replace(old.name, '_klein\.jpg$', '.jpg');
  end if;
  return old;
end;
$$;

create trigger foto_datei_geloescht
  after delete on storage.objects
  for each row execute function public.foto_eintrag_entfernen();

-- Einmalig: Einträge entfernen, deren Dateien schon gelöscht sind
delete from public.fotos f
where not exists (
  select 1 from storage.objects o
  where o.bucket_id = 'gaestefotos' and o.name = f.pfad
);
