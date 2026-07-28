# Labor Budget dashboard — automatic data check

This folder holds a health check for the **Labor Budget** dashboard
([labor_budget.html](../labor_budget.html)). It answers three questions:

1. **Do the numbers match?** — the Budget vs Actual totals the dashboard shows
   are recomputed straight from the source tables and compared.
2. **Is the data clean?** — flags bad values (negative amounts, missing areas,
   unmapped buckets, out-of-range months, silently merged rows).
3. **Does it load?** — hits the same data endpoint the dashboard uses and checks
   it responds quickly and returns the full row set.

A **FAIL** means a number on the dashboard could be wrong. A **WARN** is a
data-quality note worth a look, but the totals still add up. **INFO** is just
context.

## Files

- `labor_bva_audit.sql` — the read-only audit. Returns one row per check with
  an `OK / WARN / FAIL / INFO` status. Safe to run anytime; changes nothing.

## Run it by hand (numbers check)

Run `labor_bva_audit.sql` against the Supabase project **sfyjvgjwvtwkrnqrvqyc**
(DalOS-Vision) — via the Supabase MCP `execute_sql`, or the SQL editor in the
Supabase dashboard. Any row with status `FAIL` or `WARN` is worth attention.

## Run it by hand (loading check)

```bash
ANON='<anon key from labor_budget.html: const SB_ANON=...>'
URL='https://sfyjvgjwvtwkrnqrvqyc.supabase.co/rest/v1/labor_bva?select=budget_amount,actual_amount&limit=1000'
# count + timing (should be well under a few seconds)
curl -s -o /dev/null -w "count-call: http=%{http_code} time=%{time_total}s\n" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Prefer: count=exact" -H "Range: 0-0" -I "$URL"
```

A non-200 code, or a time of several seconds or more, points to a loading
problem (usually server load / timeout).

## Automated schedule (playbook for the scheduled check)

The scheduled check runs every 3 days and performs, in order:

1. **Numbers:** run `audit/labor_bva_audit.sql` against project
   `sfyjvgjwvtwkrnqrvqyc` using the Supabase `execute_sql` tool.
2. **Loading:** run the loading-check `curl` above and note the HTTP code and time.
3. **Report:** if every check is `OK` (and loading returned 200 quickly), reply
   with a single line — `✅ Labor Budget dashboard: all checks passed (N rows)`.
   Otherwise list each `FAIL` / `WARN` and the loading result, most serious first.

### Expected healthy baseline (as of last manual run)

- `budget_reconciles` = OK, `actual_reconciles` = OK
- `rowkey_no_collapse` = OK, `matched_dim_consistency` = OK
- `month_inside_fiscal_year` = OK, `budget_rows_have_area` = OK
- `no_negative_actual` = **WARN (3)** — known, small; investigate only if it grows
- `buckets_mapped` = **WARN (66)** — known unmapped rows; shrinks as buckets are assigned
- `row_count` ≈ **36,900** rows
