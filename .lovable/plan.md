# Filter & Advisor Card Polish

## 1. Sort By to top of Filters popover
In `src/components/advisors/AdvisorFilters.tsx`, move the **Sort By** block (currently the last section in the PopoverContent) to be the first section, above **Session Type**. No other behavior changes — desktop and mobile both benefit from sort being the most prominent option.

## 2. Fix mobile jumble of Virtual / In-Person + Location on advisor cards
In `src/pages/Advisors.tsx` (the card meta row around lines 281–297), the issue on narrow mobile widths is that the stacked "Virtual" / "In-Person" labels compete with the truncated location text, creating uneven, jumbled rows.

Fix without touching desktop:
- On mobile (`< sm`): render Virtual/In-Person as **icon-only** chips (Video / MapPin icons, no label text), shown inline in a single row. Tooltip/`aria-label` preserves accessibility ("Virtual", "In-Person").
- On `sm` and up: keep the existing icon + text layout exactly as it is today.
- Location stays right-aligned and truncated as today, but gets a touch more room on mobile because the session-type column is now narrow.

Implementation sketch:
```tsx
<div className="flex flex-col gap-0.5">
  {advisor.virtual_available && (
    <span className="flex items-center gap-0.5" aria-label="Virtual">
      <Video className="w-3 h-3" />
      <span className="hidden sm:inline">Virtual</span>
    </span>
  )}
  {advisor.in_person_available && (
    <span className="flex items-center gap-0.5" aria-label="In-Person">
      <MapPin className="w-3 h-3" />
      <span className="hidden sm:inline">In-Person</span>
    </span>
  )}
</div>
```

On mobile we can also switch the wrapper from `flex-col` to `flex-row gap-1.5` via `flex-row sm:flex-col` so the two icons sit side-by-side and free up horizontal space for the location.

## Files touched
- `src/components/advisors/AdvisorFilters.tsx` — reorder Sort By section to top of popover.
- `src/pages/Advisors.tsx` — responsive icon-only session type indicators on mobile.

## Out of scope
No changes to filter logic, sort options, card data, or desktop layout.
