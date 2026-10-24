-- Rollback-only verification; no account or merchant fixture remains.
begin;
do $$ declare uid uuid:=gen_random_uuid(); begin insert into auth.users(id) values(uid);perform set_config('request.jwt.claim.sub',uid::text,true);end $$;
set local role authenticated;
do $$ begin
 if public.import_roosevelt_island()<>2 then raise exception 'initial import failed';end if;
 if public.import_roosevelt_island()<>0 then raise exception 'import duplicated records';end if;
 if(select count(*) from public.merchant_current)<>2 then raise exception 'wrong merchant count';end if;
 if(select count(*) from public.pos_observations)<>2 then raise exception 'wrong observation count';end if;
 if not exists(select 1 from public.merchant_current where business_name='Café@Cornell' and provider='Unknown' and hardware='Ingenico' and gateway='FreedomPay' and observation_date is null) then raise exception 'Cornell data or null date lost';end if;
 if not exists(select 1 from public.merchant_current where business_name='Wholesome Factory' and provider='Clover' and observation_date is null) then raise exception 'Wholesome data lost';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if exists(select 1 from public.merchant_current) then raise exception 'cross-account leak';end if;
end $$;
reset role;rollback;
select 'PASS: real-data import, idempotency, gateway separation, unknown dates, account isolation' as verification;
