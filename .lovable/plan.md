# Availability Page Rebuild

## Goal
Make setting availability feel like 30 seconds of work, not a form-filling exercise. Single calendar. One-click presets. Inline editor. Live preview.

## Current pain
- Three concepts (weekly windows, date overrides, date blocks, breaks) presented side-by-side → cognitive overload.
- Timezone is mentioned in a help blurb, not surfaced where the advisor is picking times.
- Advisor has no idea what a client will actually see.
- AM/PM entry uses native time inputs with no validation feedback.

## New page structure (replaces `/advisor/availability` content)

```text
┌──────────────────────────────────────────────────────────────┐
│  Manage Availability         [Timezone: America/Los_Angeles ▼] │
│                                                                │
│  Quick start:  [ Weekdays 9–5 ] [ Evenings 6–9 ] [ Weekends ] │
│                                                                │
│  ┌── Calendar (next 4 weeks) ──┐  ┌── Selected day ─────────┐ │
│  │  M  T  W  T  F  S  S        │  │  Mon, Jun 8             │ │
│  │  ●  ●  ●  ●  ●  ·  ·        │  │  ◉ Available            │ │
│  │  ●  ●  ●  ●  ●  ·  ·        │  │  ○ Blocked              │ │
│  │  ●  ●  ✕  ●  ●  ·  ·        │  │                         │ │
│  │  ●  ●  ●  ●  ●  ·  ·        │  │  From: [9:00 AM ▾]      │ │
│  │                              │  │  To:   [5:00 PM ▾]      │ │
│  │  Legend: ● open  ✕ blocked  │  │  [ Apply to this day ]  │ │
│  │          · unset             │  │  [ Apply to every Mon ] │ │
│  └──────────────────────────────┘  └─────────────────────────┘ │
│                                                                │
│  ▸ Client preview (collapsible)                                │
│     Shows the exact bookable slots a client in their TZ sees. │
└──────────────────────────────────────────────────────────────┘
```

### Interactions
- **Presets** write to `advisor_availability_windows` for every weekday they cover, replacing any existing window for that day. One toast: "Weekdays 9–5 saved".
- **Click a day** → opens the right-hand editor pre-filled with whatever applies (override > weekly default).
- **Apply to this day** → writes an `advisor_date_overrides` row (or block if "Blocked" is selected).
- **Apply to every Mon** → writes the weekly default for `day_of_week = 1` and clears any override for past-applicable Mondays in the visible window.
- **Timezone selector** in the header is the same control as today, but always visible and used to label every time picker.
- **Time pickers**: 15-min increment dropdown (`Select` with `8:00 AM, 8:15 AM …`) — no native `<input type=time>`.
- **Client preview**: calls existing `get_available_booking_slots` for each visible day and renders chips. Confirms "what clients see" matches what advisor set.

## Files

### New
- `src/components/advisor/AvailabilityCalendar.tsx` — the calendar + dot rendering
- `src/components/advisor/DayEditorPanel.tsx` — right-hand panel
- `src/components/advisor/PresetButtons.tsx` — three presets
- `src/components/advisor/ClientPreview.tsx` — collapsible preview
- `src/components/advisor/TimeSelect.tsx` — 15-min increment select

### Replaced
- `src/pages/AdvisorAvailability.tsx` — composes the four components above; drops the old info-card layout
- `src/components/advisor/CalendarAvailabilityManager.tsx` → deleted (no other consumers per grep)

### Untouched
- All hooks (`useAdvisorAvailability`, `useDateOverrides`) — same data model
- DB schema — no migration needed
- `BookingCalendar.tsx` (client side) — unaffected

## Out of scope
- Recurring breaks (lunch etc.) — keep current behavior, surface in an "Advanced" disclosure later
- Bulk multi-day select drag
- Mobile-specific layout polish (will inherit responsive defaults)

## Risk
Low. Data model unchanged; only the editing UI changes. Old hooks already power saves and realtime invalidation.

## Verification
1. Pick "Weekdays 9–5" → see dots Mon–Fri across all visible weeks.
2. Click Wed → block it → dot turns ✕.
3. Open Client preview → confirm Wed has no slots.
4. Sign in as a test client → confirm BookingCalendar matches.
