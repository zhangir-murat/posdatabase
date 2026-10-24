-- Actual field reports supplied by the researcher; no observation dates were supplied.
alter table public.pos_observations add column gateway text not null default 'Unknown';
alter table public.pos_observations alter column observation_date drop not null;
create or replace view public.merchant_current with (security_invoker=true) as
select m.id,m.business_name,m.street_address,m.city,m.borough,m.neighborhood,m.zip_code,m.latitude,m.longitude,m.category,
coalesce(o.provider,'Unknown') as provider,coalesce(o.hardware,'Unknown') as hardware,coalesce(o.verification_status,'Unverified') as verification_status,
o.observation_date,coalesce(o.notes,'') as notes,coalesce(o.evidence_method,'') as evidence_method,o.id as observation_id,
(select count(*)::integer from public.pos_observations h where h.merchant_id=m.id) as observation_count,coalesce(o.gateway,'Unknown') as gateway
from public.merchants m left join lateral(select * from public.pos_observations o where o.merchant_id=m.id order by observation_date desc nulls last,created_at desc,id desc limit 1) o on true;
create or replace function public.save_merchant_observation(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
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
 insert into public.pos_observations(merchant_id,owner_id,provider,hardware,gateway,verification_status,observation_date,evidence_method,notes)
 values(mid,uid,coalesce(payload->>'provider','Unknown'),coalesce(payload->>'hardware','Unknown'),coalesce(payload->>'gateway','Unknown'),payload->>'verification_status',nullif(payload->>'observation_date','')::date,coalesce(payload->>'evidence_method','Visual inspection'),coalesce(payload->>'notes',''));
 return mid;
end $$;
revoke all on function public.save_merchant_observation(jsonb) from public,anon;
grant execute on function public.save_merchant_observation(jsonb) to authenticated;

create function public.import_roosevelt_island() returns integer
language plpgsql security invoker set search_path='' as $$
declare entry jsonb; inserted integer:=0;
begin
 if auth.uid() is null then raise exception 'Researcher sign-in required'; end if;
 for entry in select value from jsonb_array_elements($reports$[{"city": "New York", "borough": "Manhattan", "neighborhood": "Roosevelt Island", "zip_code": "10044", "observation_date": "", "evidence_method": "Researcher-reported field observation", "business_name": "Café@Cornell", "street_address": "2 West Loop Road", "latitude": 40.755686, "longitude": -73.956266, "category": "Café & bakery", "provider": "Unknown", "hardware": "Ingenico", "gateway": "FreedomPay", "verification_status": "Unverified", "notes": "Researcher reported: cafe@cornell — ingenico/freedompay. Ingenico is the terminal hardware and FreedomPay is the payment gateway; the underlying POS software was not identified. Observation date was not supplied. Address: Cornell Tech directory, https://tech.cornell.edu/contact/. Coordinates are an approximate address point from NYC Planning GeoSearch (nycpad 181837, confidence 0.8, fallback match); checkout/entrance position is not field-verified."}, {"city": "New York", "borough": "Manhattan", "neighborhood": "Roosevelt Island", "zip_code": "10044", "observation_date": "", "evidence_method": "Researcher-reported field observation", "business_name": "Wholesome Factory", "street_address": "530 Main Street", "latitude": 40.760979, "longitude": -73.950442, "category": "Grocery & deli", "provider": "Clover", "hardware": "Unknown", "gateway": "Unknown", "verification_status": "Verified", "notes": "Researcher reported: wholesome on roosevelt island — clover. Clover is recorded as the reported POS provider. Terminal model, separate gateway, and observation date were not supplied. Address: Cornell dining directory, https://www.cs.cornell.edu/sites/default/files/shared/housing_banking_dining_at_tech.pdf. Coordinates are an approximate address point from NYC Planning GeoSearch (nycpad 181788, confidence 0.8, fallback match); checkout/entrance position is not field-verified."}]$reports$::jsonb) loop
  if not exists(select 1 from public.merchants where owner_id=auth.uid() and lower(trim(business_name))=lower(trim(entry->>'business_name')) and lower(trim(street_address))=lower(trim(entry->>'street_address')) and zip_code=entry->>'zip_code') then
   perform public.save_merchant_observation(entry);
   inserted:=inserted+1;
  end if;
 end loop;
 return inserted;
end $$;
revoke all on function public.import_roosevelt_island() from public,anon;
grant execute on function public.import_roosevelt_island() to authenticated;
