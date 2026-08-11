# Splits — Reference Documentation

This document describes the splits feature of GymbroTS for use by agents building the administration web application. It covers the database schema, business logic, data flow, and TypeScript types as they exist in the current codebase.

---

## What is a Split?

A **split** is a user's weekly workout schedule template. It defines which workout (if any) is assigned to each day of the week (Monday–Sunday). The same template repeats every week. Per-week instances track which days the user has actually completed.

Key concepts:

- One user can have at most **one split** at a time.
- A split has **7 days** (Monday through Sunday), each optionally assigned a workout. Days with no workout are "rest days".
- Each calendar week gets its own **split_week** record that tracks completion independently.
- The app shows the current week plus **5 upcoming weeks**, each with their own completion state.
- When the user edits and saves a new split template, all `split_day` rows are replaced and old `split_week` history older than 2 weeks is deleted.

---

## Database Schema

> **Note:** The migration file (`migration/supabase-migration.sql`) contains an older schema with `SPLIT` and `DAY` tables. The **actual live schema** used by the code uses the tables below. Use this section as the authoritative reference.

### `split`

The template record for a user's weekly plan. One row per user.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key, `gen_random_uuid()` |
| `user_id` | `UUID` | FK → `app_user(id)` ON DELETE CASCADE |
| `spl_ref_week` | `INTEGER` | ISO week number when the template was last saved |
| `created_at` | `TIMESTAMP` | |
| `updated_at` | `TIMESTAMP` | |

### `split_day`

One row per day of the week within a split template (7 rows per split).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `split_id` | `UUID` | FK → `split(id)` ON DELETE CASCADE |
| `day_of_week` | `INTEGER` | ISO day: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0 |
| `workout_id` | `UUID` | FK → `workout(id)` ON DELETE SET NULL. NULL = rest day |
| `ordinal` | `INTEGER` | 0–6, position order (Mon=0 … Sun=6) |

> `ordinal` is the array index used when matching to `completed_days` in `split_week`.

### `split_week`

One row per calendar week per split. Created lazily when a week is first viewed.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key |
| `split_id` | `UUID` | FK → `split(id)` ON DELETE CASCADE |
| `week_number` | `INTEGER` | ISO week number (e.g. 14 for week 14 of the year) |
| `completed_days` | `INTEGER[]` | Array of `ordinal` values that are marked complete |

**Unique constraint:** `(split_id, week_number)`

### Related tables (abbreviated)

```
workout
  id          UUID PK
  wor_name    VARCHAR
  wor_user_id UUID FK → app_user(id)
  wor_completed_count INTEGER
  wor_estimate_time   INTEGER  (minutes)
  wor_last_done       TIMESTAMP

app_user
  id    UUID PK
  name  VARCHAR
  email VARCHAR UNIQUE
```

### Entity-relationship overview

```
app_user (1) ──── (0..1) split (1) ──── (7) split_day ──── (0..1) workout
                              │
                              └──── (many) split_week
```

---

## TypeScript Interfaces

Source: `services/SplitService.Service.ts` and `interfaces/Split.Interface.ts`

```typescript
// A single day slot within a week view
interface SplitDay {
    workout: Workout | null;  // null = rest day
    completed: boolean;
    day: string;              // "Monday" | "Tuesday" | ... | "Sunday"
    weekId?: string;          // split_week.id for this calendar week
}

// A full week (7 days)
interface SplitWeek {
    Monday:    SplitDay;
    Tuesday:   SplitDay;
    Wednesday: SplitDay;
    Thursday:  SplitDay;
    Friday:    SplitDay;
    Saturday:  SplitDay;
    Sunday:    SplitDay;
}

// Top-level response from getReferenceWeek()
interface SplitData {
    weeks: SplitWeek[];    // Array of 5 weeks starting from current week
    spl_ref_week: number;  // ISO week number when template was last saved
}

// Workout (simplified)
interface Workout {
    id: string;
    worName: string;
    worCompletedCount: number;
    worEstimateTime: number;
    worLastDone: string;
    worUserId: string;
}
```

---

## Day Ordering

The code uses these constants throughout:

```typescript
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // ISO day numbers for each WEEK_DAYS entry
```

- `ordinal` in `split_day` maps directly to the position in `WEEK_DAYS` (0 = Monday, 6 = Sunday).
- `day_of_week` in `split_day` stores the ISO numeric value (1–6 for Mon–Sat, 0 for Sun).
- `completed_days` in `split_week` stores `ordinal` values (0–6), **not** ISO day numbers.

---

## Core Service Functions

Source: `services/SplitService.Service.ts`

### `getReferenceWeek(usr_id: string): Promise<SplitData | null>`

Fetches the full split data for a user including 5 weeks of completion state.

**Steps:**
1. Query `split` by `user_id` → get `id` and `spl_ref_week`.
2. Query `split_day` ordered by `day_of_week` → get all 7 day templates.
3. For each of the 5 weeks (current week + 4):
   - Call `getOrCreateSplitWeek()` to ensure a `split_week` row exists.
   - Fetch `completed_days` from the `split_week` row.
   - For each day slot, fetch the full `Workout` object via `getWorkoutById()` if `workout_id` is set.
   - Build a `SplitWeek` object, setting `completed: completedDays.includes(ordinal)`.
4. Return `{ weeks, spl_ref_week }`.

Returns `null` if the user has no split.

---

### `getOrCreateSplitWeek(splitId: string, weekNumber: number): Promise<string>`

Lazy creation of `split_week` rows. Returns the `id` of the row.

**Steps:**
1. Try SELECT from `split_week` WHERE `split_id = splitId AND week_number = weekNumber`.
2. If found, return `id`.
3. Otherwise INSERT `{ split_id, week_number, completed_days: [] }` and return new `id`.

---

### `markDayAsCompleted(weekId: string, day: string, completed: boolean): Promise<void>`

Toggles completion for a single day in a specific week.

**Steps:**
1. Convert `day` string (e.g. `"Tuesday"`) to ordinal via `WEEK_DAYS.indexOf(day)`.
2. SELECT `completed_days` FROM `split_week` WHERE `id = weekId`.
3. Add or remove the ordinal from the array.
4. UPDATE `split_week` SET `completed_days = <new array>` WHERE `id = weekId`.

---

### `addReferenceWeek(referenceWeek: SplitWeek, usr_id: string): Promise<void>`

Creates or fully replaces a user's split template.

**Steps:**
1. Look up existing `split` by `user_id`.
2. If none: INSERT new `split` row with `spl_ref_week = currentISOWeek`.
3. If exists: UPDATE `spl_ref_week = currentISOWeek`.
4. DELETE all existing `split_day` rows for this split.
5. INSERT 7 new `split_day` rows from `referenceWeek`, one per day with `workout_id` (or `null`) and `ordinal`.
6. DELETE `split_week` rows where `week_number < currentWeek - 2` (keep only recent history).

---

## Business Rules

| Rule | Detail |
|---|---|
| One split per user | `split.user_id` is effectively unique (code uses `.single()`) |
| Rest day | A `split_day` row with `workout_id = NULL` |
| Completion is per-week | Checking off Monday in week 14 does not affect week 15 |
| Week numbering | ISO week number from `getWeekNumber(new Date())` in `StatsService` |
| History retention | Only the last 2 calendar weeks of `split_week` data are kept when a new template is saved |
| Editing a split | Fully replaces all 7 `split_day` rows; `split` row is reused |
| Deleting a split | Cascade delete removes all `split_day` and `split_week` rows |
| Minimum requirement | At least one day must have a workout assigned (client-side validation) |

---

## Web Admin Implementation Notes

When building the admin web page for splits, consider the following:

### Fetching a split for a user

```
GET split WHERE user_id = <userId>
  → GET split_day WHERE split_id = <splitId> ORDER BY ordinal
  → For each week to display:
       GET/CREATE split_week WHERE split_id = <splitId> AND week_number = <n>
       GET split_week.completed_days
```

### Displaying a split

- Show 7 day cards (Mon–Sun) with the workout name or "Rest day".
- For each week instance, use `completed_days` (array of ordinals 0–6) to render checkboxes.
- Week label: "Week N" where N is the ISO week number.

### Editing / creating a split

- Let the user assign a workout (from their workout list) to each day or leave it as a rest day.
- On save: call the equivalent of `addReferenceWeek` — upsert `split`, delete old `split_day` rows, insert 7 new ones.

### Marking a day complete

- Fetch `split_week.completed_days` for that week's row.
- Add or remove the day's `ordinal` (0–6) from the array.
- Update the row.

### Supabase table names (exact, lowercase)

- `split`
- `split_day`
- `split_week`
- `workout`
- `app_user`

---

## File Locations (Mobile App)

| Purpose | Path |
|---|---|
| Split service (all DB logic) | `services/SplitService.Service.ts` |
| Split interfaces | `interfaces/Split.Interface.ts` |
| Split tab screen | `app/(tabs)/splitTab.tsx` |
| Create/edit split screen | `app/split/createSplit.tsx` |
| Week number utility | `services/StatsService.Service.ts` → `getWeekNumber()` |
| Workout fetch by ID | `services/WorkoutService.Service.ts` → `getWorkoutById()` |
| Supabase client | `supabaseConfig.js` |
| DB migration (partially outdated) | `migration/supabase-migration.sql` |
