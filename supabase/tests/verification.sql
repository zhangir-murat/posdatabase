-- Run in the Supabase SQL editor. All test fixtures are rolled back.
begin;
do $$ declare uid uuid:=gen_random_uuid(); begin
insert into auth.users(id) values(uid);
perform set_config('request.jwt.claim.sub',uid::text,true);
end $$;
set local role authenticated;
do $$ declare mid uuid; other_uid uuid:=gen_random_uuid(); original text:=current_setting('request.jwt.claim.sub');
payload jsonb:='{"business_name":"ATLAS TRANSACTION TEST","street_address":"1 Test Street","borough":"Manhattan","neighborhood":"Roosevelt Island","zip_code":"10044","latitude":40.7625,"longitude":-73.9501,"category":"Retail","provider":"Square","hardware":"Unknown","verification_status":"Verified","observation_date":"2026-10-01","evidence_method":"Test","notes":"Rollback-only verification"}'::jsonb;
begin
mid:=public.save_merchant_observation(payload);
if (select count(*) from public.merchant_current where id=mid and provider='Square')<>1 then raise exception 'save/view failed';end if;
perform public.save_merchant_observation(payload || jsonb_build_object('id',mid,'provider','Clover','verification_status','Inferred','observation_date','2026-09-01'));
if (select provider from public.merchant_current where id=mid)<>'Square' then raise exception 'latest date failed';end if;
if (select count(*) from public.pos_observations where merchant_id=mid)<>2 then raise exception 'history preservation failed';end if;
begin
perform public.save_merchant_observation(payload);
raise exception 'duplicate accepted';
exception when unique_violation then null;end;
begin
perform public.save_merchant_observation(payload || '{"business_name":"INVALID PAIR","longitude":null}'::jsonb);
raise exception 'partial coordinates accepted';
exception when check_violation then null;end;
if exists(select 1 from public.merchants where business_name='INVALID PAIR') then raise exception 'atomic rollback failed';end if;
perform set_config('request.jwt.claim.sub',other_uid::text,true);
if exists(select 1 from public.merchant_current) then raise exception 'cross-user data visible';end if;
begin
perform public.save_merchant_observation(payload || jsonb_build_object('id',mid));
raise exception 'cross-user update accepted';
exception when raise_exception then if sqlerrm='cross-user update accepted' then raise;end if;end;
perform set_config('request.jwt.claim.sub',original,true);
if (select count(*) from public.merchants_in_bbox(-73.96,40.75,-73.94,40.77))<>1 then raise exception 'bbox failed';end if;
end $$;
reset role;
rollback;
select 'PASS: atomic writes, history, latest date, duplicates, coordinates, RLS isolation, bbox' as result;
