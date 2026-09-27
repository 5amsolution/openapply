-- Users can also save their own Remote Rocketship API key.
alter table public.source_keys drop constraint if exists source_keys_source_check;
alter table public.source_keys add constraint source_keys_source_check check (source in ('jsearch', 'remoterocketship'));
