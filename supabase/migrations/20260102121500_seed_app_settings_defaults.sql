-- Seed default keys if they don't exist yet.
insert into public.app_settings (setting_key, setting_value)
select 'admin_passkey', ''
where not exists (select 1 from public.app_settings where setting_key = 'admin_passkey');

insert into public.app_settings (setting_key, setting_value)
select 'telegram_bot_token', ''
where not exists (select 1 from public.app_settings where setting_key = 'telegram_bot_token');

insert into public.app_settings (setting_key, setting_value)
select 'telegram_chat_id', ''
where not exists (select 1 from public.app_settings where setting_key = 'telegram_chat_id');

insert into public.app_settings (setting_key, setting_value)
select 'passenger_order', '[]'
where not exists (select 1 from public.app_settings where setting_key = 'passenger_order');

insert into public.app_settings (setting_key, setting_value)
select 'daily_destinations', '[]'
where not exists (select 1 from public.app_settings where setting_key = 'daily_destinations');