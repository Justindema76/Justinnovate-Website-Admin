-- Sunwings Transport content model for Just Innovate Admin + public Next.js frontend

insert into public.sites (site_key, name, domain, admin_label, is_active)
values ('sunwings','Sunwings Transport','sunwingstransport.ca','Sunwings Transport',true)
on conflict (site_key) do update set
  name = excluded.name,
  domain = excluded.domain,
  admin_label = excluded.admin_label,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.sunwings_services (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'sunwings',
  slug text not null,
  title text not null,
  eyebrow text not null default '',
  hero_title text not null default '',
  hero_description text not null default '',
  banner_image text not null default '',
  banner_alt text not null default '',
  intro text not null default '',
  body_html text not null default '',
  bullets text[] not null default '{}',
  cta_title text not null default '',
  cta_text text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  og_image text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_key, slug)
);

create table if not exists public.sunwings_locations (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'sunwings',
  slug text not null,
  title text not null,
  region text not null default '',
  eyebrow text not null default '',
  hero_title text not null default '',
  hero_description text not null default '',
  banner_image text not null default '',
  banner_alt text not null default '',
  intro text not null default '',
  body_html text not null default '',
  neighbourhoods text[] not null default '{}',
  service_slugs text[] not null default '{}',
  faq jsonb not null default '[]'::jsonb,
  cta_title text not null default '',
  cta_text text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  og_image text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_key, slug)
);

create table if not exists public.sunwings_site_settings (
  site_key text not null references public.sites(site_key) on delete cascade default 'sunwings',
  key text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key(site_key, key)
);

create table if not exists public.sunwings_quote_requests (
  id uuid primary key default gen_random_uuid(),
  site_key text not null references public.sites(site_key) on delete cascade default 'sunwings',
  name text not null,
  phone text not null,
  email text not null default '',
  service text not null default '',
  move_from text not null default '',
  move_to text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new','contacted','quoted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sunwings_services_status_sort_idx on public.sunwings_services(site_key,status,sort_order);
create index if not exists sunwings_locations_status_sort_idx on public.sunwings_locations(site_key,status,sort_order);
create index if not exists sunwings_quotes_status_idx on public.sunwings_quote_requests(site_key,status,created_at desc);

alter table public.sunwings_services enable row level security;
alter table public.sunwings_locations enable row level security;
alter table public.sunwings_site_settings enable row level security;
alter table public.sunwings_quote_requests enable row level security;

drop policy if exists "public reads published sunwings services" on public.sunwings_services;
create policy "public reads published sunwings services"
on public.sunwings_services for select to anon, authenticated
using (site_key='sunwings' and status='published');

drop policy if exists "public reads published sunwings locations" on public.sunwings_locations;
create policy "public reads published sunwings locations"
on public.sunwings_locations for select to anon, authenticated
using (site_key='sunwings' and status='published');

drop policy if exists "public reads sunwings settings" on public.sunwings_site_settings;
create policy "public reads sunwings settings"
on public.sunwings_site_settings for select to anon, authenticated
using (site_key='sunwings');

drop policy if exists "public creates sunwings quote requests" on public.sunwings_quote_requests;
create policy "public creates sunwings quote requests"
on public.sunwings_quote_requests for insert to anon, authenticated
with check (site_key='sunwings');

drop policy if exists "owner manages sunwings services" on public.sunwings_services;
create policy "owner manages sunwings services"
on public.sunwings_services for all to authenticated
using ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google')
with check ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google');

drop policy if exists "owner manages sunwings locations" on public.sunwings_locations;
create policy "owner manages sunwings locations"
on public.sunwings_locations for all to authenticated
using ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google')
with check ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google');

drop policy if exists "owner manages sunwings settings" on public.sunwings_site_settings;
create policy "owner manages sunwings settings"
on public.sunwings_site_settings for all to authenticated
using ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google')
with check ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google');

drop policy if exists "owner reads and manages sunwings quotes" on public.sunwings_quote_requests;
create policy "owner reads and manages sunwings quotes"
on public.sunwings_quote_requests for all to authenticated
using ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google')
with check ((select auth.jwt()->>'email')='justindema76@gmail.com' and (select auth.jwt()->'app_metadata'->>'provider')='google');

grant select on public.sunwings_services, public.sunwings_locations, public.sunwings_site_settings to anon;
grant insert on public.sunwings_quote_requests to anon;
grant select,insert,update,delete on public.sunwings_services, public.sunwings_locations, public.sunwings_site_settings, public.sunwings_quote_requests to authenticated;

create or replace function public.set_sunwings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sunwings_services_updated_at on public.sunwings_services;
create trigger sunwings_services_updated_at before insert or update on public.sunwings_services
for each row execute function public.set_sunwings_updated_at();

drop trigger if exists sunwings_locations_updated_at on public.sunwings_locations;
create trigger sunwings_locations_updated_at before insert or update on public.sunwings_locations
for each row execute function public.set_sunwings_updated_at();

drop trigger if exists sunwings_quotes_updated_at on public.sunwings_quote_requests;
create trigger sunwings_quotes_updated_at before update on public.sunwings_quote_requests
for each row execute function public.set_sunwings_updated_at();

insert into public.sunwings_site_settings(site_key,key,value) values
('sunwings','phone','647-526-5132'),
('sunwings','email','dispatch@sunwingstransport.ca'),
('sunwings','hero_title','Hamilton & Niagara Moving, Delivery & Commercial Transport'),
('sunwings','hero_description','Professional residential moving, furniture delivery, commercial transport, warehouse support and general labour across Hamilton and the Niagara Region.'),
('sunwings','hero_image',''),
('sunwings','hero_cta_label','View Services'),
('sunwings','hero_cta_url','/services')
on conflict (site_key,key) do nothing;
