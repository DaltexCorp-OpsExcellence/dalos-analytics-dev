-- =====================================================================
-- Labor Budget dashboard — data audit
-- Verifies the numbers behind labor_budget.html against the source tables.
-- Returns one row per check with a status: OK / WARN / FAIL / INFO.
--
-- Run against Supabase project: sfyjvgjwvtwkrnqrvqyc (DalOS-Vision)
-- Safe & read-only. FAIL = numbers on the dashboard could be wrong.
-- WARN = data-quality issue worth a look, but the totals still add up.
--
-- labor_bva = FULL JOIN of labor_budget (b) and labor_actual (a),
-- each grouped by (budget_season, row_key), joined on row_key.
-- =====================================================================
with
v as (select coalesce(sum(budget_amount),0) vb, coalesce(sum(actual_amount),0) va, count(*) n,
             count(*) filter (where actual_amount<0) na, count(*) filter (where budget_amount<0) nb,
             count(*) filter (where budget_amount>0 and (net_area is null or net_area<=0)) bna,
             count(*) filter (where bucket_status='unmapped' or operational_bucket is null) unm,
             count(*) filter (where month is null) nm,
             count(*) filter (where month not in ('Oct''25','Nov''25','Dec''25','Jan''26','Feb''26','Mar''26','Apr''26','May''26','Jun''26','Jul''26','Aug''26','Sep''26')) mof
      from labor_bva),
sb as (select coalesce(sum(budget_amount),0) sb from labor_budget),
sa as (select coalesce(sum(actual_amount),0) sa from labor_actual),
collapse as (
  select
   (select count(*) from (select 1 from labor_budget group by budget_season,row_key
      having count(distinct month)>1 or count(distinct plot)>1 or count(distinct product)>1 or count(distinct variety_en)>1) x)
 + (select count(*) from (select 1 from labor_actual group by budget_season,row_key
      having count(distinct month)>1 or count(distinct plot)>1 or count(distinct product)>1 or count(distinct variety_en)>1) y) as c),
dim as (
  select count(*) filter (where b.product is distinct from a.product or b.farm is distinct from a.farm
                            or b.plot is distinct from a.plot or b.variety_en is distinct from a.variety_en
                            or b.month is distinct from a.month) as d
  from (select budget_season,row_key,min(product) as product,min(farm) as farm,min(plot) as plot,min(variety_en) as variety_en,min(month) as month from labor_budget group by 1,2) b
  join (select budget_season,row_key,min(product) as product,min(farm) as farm,min(plot) as plot,min(variety_en) as variety_en,min(month) as month from labor_actual group by 1,2) a
    on b.row_key=a.row_key and b.budget_season=a.budget_season)
select check_name, detail, status from (
  select 1 ord,'budget_reconciles' check_name, 'view='||round(v.vb,2)||' src='||round(sb.sb,2) detail, case when round(v.vb,2)=round(sb.sb,2) then 'OK' else 'FAIL' end status from v,sb
  union all select 2,'actual_reconciles','view='||round(v.va,2)||' src='||round(sa.sa,2), case when round(v.va,2)=round(sa.sa,2) then 'OK' else 'FAIL' end from v,sa
  union all select 3,'rowkey_no_collapse', collapse.c||' keys span >1 month/plot/product/variety', case when collapse.c=0 then 'OK' else 'FAIL' end from collapse
  union all select 4,'matched_dim_consistency', dim.d||' matched rows disagree on dim/month', case when dim.d=0 then 'OK' else 'FAIL' end from dim
  union all select 5,'month_inside_fiscal_year', v.mof||' rows outside Oct25-Sep26; '||v.nm||' null month', case when v.mof=0 and v.nm=0 then 'OK' else 'FAIL' end from v
  union all select 6,'budget_rows_have_area', v.bna||' budgeted rows missing area (break CPF)', case when v.bna=0 then 'OK' else 'WARN' end from v
  union all select 7,'no_negative_actual', v.na||' negative actual amounts', case when v.na=0 then 'OK' else 'WARN' end from v
  union all select 8,'no_negative_budget', v.nb||' negative budget amounts', case when v.nb=0 then 'OK' else 'WARN' end from v
  union all select 9,'buckets_mapped', v.unm||' rows with no operational bucket', case when v.unm=0 then 'OK' else 'WARN' end from v
  union all select 10,'row_count', v.n||' rows in labor_bva', 'INFO' from v
) t order by ord;
