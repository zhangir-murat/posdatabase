-- Rollback-only check of incremental imports from the original two reports.
begin;
do $$ declare uid uuid:=gen_random_uuid();begin insert into auth.users(id) values(uid);perform set_config('request.jwt.claim.sub',uid::text,true);end $$;
set local role authenticated;
do $$ begin
if public.import_roosevelt_island()<>2 then raise exception 'legacy import failed';end if;
if public.import_field_reports()<>15 then raise exception 'incremental fifteen import failed';end if;
if public.import_field_reports()<>0 then raise exception 'duplicate import';end if;
if (select count(*) from public.merchant_current)<>17 then raise exception 'expected seventeen records';end if;
if (select count(*) from public.pos_observations)<>17 then raise exception 'unexpected observation duplication';end if;
if (select count(*) from public.merchant_current where provider='Unknown')<>7 then raise exception 'POS brand conflation';end if;
if not exists(select 1 from public.merchant_current where business_name='LaVista Pizza — 2nd Avenue' and provider='Unknown' and payment_platform='Valor PayTech' and gateway='Unknown')then raise exception 'Valor conflation';end if;
if (select count(*) from public.merchant_current where hardware='Verifone')<>4 then raise exception 'terminal records lost';end if;
if exists(select 1 from public.pos_observations where observation_date is not null)then raise exception 'invented dates';end if;
perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
if exists(select 1 from public.merchant_current)then raise exception 'account isolation failed';end if;
end $$;
reset role;rollback;
select 'PASS: legacy migration, incremental import, idempotency, payment role separation, unknown dates, RLS isolation' as verification;
