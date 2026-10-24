create extension if not exists postgis with schema extensions;
create table public.pos_providers(id text primary key, name text not null unique);
insert into public.pos_providers values ('Square','Square'),('Toast','Toast'),('Clover','Clover'),('Shopify POS','Shopify POS'),('Lightspeed','Lightspeed'),('Other','Other'),('Unknown','Unknown');
alter table public.pos_providers enable row level security;
create policy provider_read on public.pos_providers for select to anon,authenticated using(true);
grant select on public.pos_providers to anon,authenticated;
create table public.merchants(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 business_name text not null check(length(trim(business_name)) between 1 and 200),
 street_address text not null check(length(trim(street_address)) between 1 and 300),
 city text not null default 'New York',
 borough text not null check(borough in ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')),
 neighborhood text not null default '',
 zip_code text not null check(zip_code ~ '^[0-9]{5}$'),
 latitude double precision, longitude double precision,
 category text not null check(category in ('Café & bakery','Restaurant','Bar & nightlife','Grocery & deli','Retail','Health & beauty','Services','Other')),
 location extensions.geometry(Point,4326) generated always as (case when latitude is not null and longitude is not null then extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326) end) stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between 40.4774 and 40.9176 and longitude between -74.2591 and -73.7004)),
 unique(id,owner_id)
);
create unique index merchant_duplicate_idx on public.merchants(owner_id,lower(trim(business_name)),lower(trim(street_address)),zip_code);
create index merchant_location_idx on public.merchants using gist(location);
create index merchant_owner_borough_category_idx on public.merchants(owner_id,borough,category);
create table public.pos_observations(
 id uuid primary key default gen_random_uuid(),
 merchant_id uuid not null,owner_id uuid not null default auth.uid(),
 provider text not null default 'Unknown' references public.pos_providers(id),
 hardware text not null default 'Unknown',
 verification_status text not null check(verification_status in ('Verified','Inferred','Unverified')),
 observation_date date not null check(observation_date <= (now() at time zone 'America/New_York')::date),
 evidence_method text not null default 'Visual inspection',
 notes text not null default '' check(length(notes)<=10000),
 created_at timestamptz not null default now(),
 foreign key(merchant_id,owner_id) references public.merchants(id,owner_id) on delete cascade,
 check(verification_status <> 'Verified' or provider <> 'Unknown')
);
create index observation_latest_idx on public.pos_observations(merchant_id,observation_date desc,created_at desc,id desc);
create index observation_owner_idx on public.pos_observations(owner_id);
create table public.import_batches(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),file_name text not null,status text not null default 'pending' check(status in ('pending','validated','imported','failed')),created_at timestamptz not null default now());
create table public.import_rows(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),batch_id uuid not null references public.import_batches(id),row_number integer not null,raw_data jsonb not null,validation_errors jsonb not null default '[]',unique(batch_id,row_number));
create table public.observation_photos(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),observation_id uuid not null references public.pos_observations(id),object_path text not null,caption text,created_at timestamptz not null default now());
create table public.analysis_grids(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),name text not null,cell_size_m integer not null check(cell_size_m between 50 and 5000),projected_srid integer not null default 26918 check(projected_srid=26918),created_at timestamptz not null default now());
create table public.grid_cells(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),grid_id uuid not null references public.analysis_grids(id),cell_key text not null,boundary extensions.geometry(Polygon,26918) not null,unique(grid_id,cell_key));
create index grid_boundary_idx on public.grid_cells using gist(boundary);
do $$ declare t text; begin
 foreach t in array array['merchants','pos_observations','import_batches','import_rows','observation_photos','analysis_grids','grid_cells'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(owner_id = (select auth.uid()))',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check(owner_id = (select auth.uid()))',t);
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('revoke all on public.%I from anon',t);
 end loop;
end $$;
create policy owner_update on public.merchants for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant update on public.merchants to authenticated;
-- Phase 2 tables are provisioned but not writable via clients until cross-parent ownership workflows ship.
revoke insert on public.import_batches,public.import_rows,public.observation_photos,public.analysis_grids,public.grid_cells from authenticated;
create view public.merchant_current with (security_invoker=true) as
select m.id,m.business_name,m.street_address,m.city,m.borough,m.neighborhood,m.zip_code,m.latitude,m.longitude,m.category,
coalesce(o.provider,'Unknown') as provider,coalesce(o.hardware,'Unknown') as hardware,coalesce(o.verification_status,'Unverified') as verification_status,
o.observation_date,coalesce(o.notes,'') as notes,coalesce(o.evidence_method,'') as evidence_method,o.id as observation_id,
(select count(*)::integer from public.pos_observations h where h.merchant_id=m.id) as observation_count
from public.merchants m left join lateral(select * from public.pos_observations o where o.merchant_id=m.id order by observation_date desc,created_at desc,id desc limit 1) o on true;
grant select on public.merchant_current to authenticated;
revoke all on public.merchant_current from anon;
create function public.save_merchant_observation(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare mid uuid; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Researcher sign-in required';end if;
 mid:=nullif(payload->>'id','')::uuid;
 if mid is null then
 insert into public.merchants(owner_id,business_name,street_address,city,borough,neighborhood,zip_code,latitude,longitude,category)
 values(uid,trim(payload->>'business_name'),trim(payload->>'street_address'),coalesce(payload->>'city','New York'),payload->>'borough',coalesce(payload->>'neighborhood',''),payload->>'zip_code',(payload->>'latitude')::double precision,(payload->>'longitude')::double precision,payload->>'category') returning id into mid;
 else
 update public.merchants set business_name=trim(payload->>'business_name'),street_address=trim(payload->>'street_address'),borough=payload->>'borough',neighborhood=coalesce(payload->>'neighborhood',''),zip_code=payload->>'zip_code',latitude=(payload->>'latitude')::double precision,longitude=(payload->>'longitude')::double precision,category=payload->>'category',updated_at=now() where id=mid and owner_id=uid;
 if not found then raise exception 'Merchant not found or not owned';end if;
 end if;
 insert into public.pos_observations(merchant_id,owner_id,provider,hardware,verification_status,observation_date,evidence_method,notes)
 values(mid,uid,coalesce(payload->>'provider','Unknown'),coalesce(payload->>'hardware','Unknown'),payload->>'verification_status',(payload->>'observation_date')::date,coalesce(payload->>'evidence_method','Visual inspection'),coalesce(payload->>'notes',''));
 return mid;
end $$;
revoke all on function public.save_merchant_observation(jsonb) from public,anon;
grant execute on function public.save_merchant_observation(jsonb) to authenticated;
create function public.merchants_in_bbox(west double precision,south double precision,east double precision,north double precision)
returns setof public.merchant_current language sql stable security invoker set search_path='' as $$
select v.* from public.merchant_current v join public.merchants m on m.id=v.id
where m.location operator(extensions.&&) extensions.st_makeenvelope(west,south,east,north,4326)
$$;
revoke all on function public.merchants_in_bbox(double precision,double precision,double precision,double precision) from public,anon;
grant execute on function public.merchants_in_bbox(double precision,double precision,double precision,double precision) to authenticated;
