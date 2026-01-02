-- Create a helper function to upsert app_settings safely under RLS.
create or replace function public.upsert_app_setting(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.app_settings where setting_key = p_key) then
    update public.app_settings
    set setting_value = p_value, updated_at = now()
    where setting_key = p_key;
  else
    insert into public.app_settings (setting_key, setting_value)
    values (p_key, p_value);
  end if;
end;
$$;

grant execute on function public.upsert_app_setting(text, text) to anon, authenticated;