# Load Progression Spec — meso-tracker

Version 2.3 · 22 Sep 2026 — closes the §2 equipment audit and, with it, the §4 survey
placeholder. No rule changes and no data changes: every category default was confirmed
correct at the equipment, so no new `step` override was needed.

Version 2.2 · 22 Sep 2026 — generalises block length. `blockLength` is per block, read from
that block's PROGRAM; the deload is the final week, by position. Adds §13.7 PROGRAM validation,
replaces §13.4's order rule, and corrects v2.1's attribution on vector 7. Behaviour-identical
for four-week blocks: all 52 existing vectors pass unchanged, which is the amendment's own
acceptance test. Vectors 53–59 are new.

Version 2.1a · 22 Sep 2026 — first completed line of the §2 equipment audit: the EZ bars
carry no 5 lb increment, so four exercises take `step: 10` over the Barbell default. Library
data and documentation only; no engine change.

Version 2.1 · 5 Sep 2026 — records the Machine Flye increment correction, rules on vector 7,
and adds a documentation rule for measured claims, which is the general form of the defect the
correction exposed. No engine change: library data and documentation only.

Version 2.0 · 31 Aug 2026 — §4 is reshaped from a **rep-buffer requirement** into a
**landing check**. Major version because the gate's premise changes, not its constants. Also
records two decisions so they stop being re-derived: fractional plates are out of the solution
space, and the session report is not URL-prefilled.

> **§4 v2.0 SHIPPED 22 Sep 2026, at the Meso 01/02 boundary.** The deferral held for the whole
> of Meso 01: the engine ran the v1.9 gate from 31 August until the block closed, so no
> suggestion changed under a lifter mid-block, which is what the deferral was for. Meso 01 is
> complete and exported; Meso 02 has not started. `SPEC_VERSION` now reads 2.1a, matching this
> document — v2.1 and v2.1a were library data and documentation only, so the engine implements
> every rule in it.

Version 1.9 · 30 Aug 2026 — §13 mesocycle lifecycle (block creation, seeding, the block
boundary, carry-over, PROGRAM drift, read-only history) and §14 substitution eligibility, which
**corrects an error in v1.6**: the claim that swapping a leg extension for a leg press "would
roughly double quad volume" was wrong, since set counts come from PROGRAM and do not change on
a swap. §13 supersedes the v1.6 §13 draft entirely — that draft was never applied and should
not be consulted. Storage shape is not specified by the amendment; it is the implementation's.
Supersedes v1.8, below.

Version 1.8 · 30 Aug 2026 — rules on whether a skip suppresses logged sets. **§1's
reference week is unchanged**; the amendment records that as decided and corrects the
`INCOMPLETE` family of strings, which misattributed cause. Strings and documentation only —
no schema change, no stored data, no engine logic change. Supersedes v1.7, below.

Version 1.7 · 27 Aug 2026 — §2 models the dumbbell rack. `step` is derived from the loads
that actually exist rather than assumed uniform, because the rack runs 10, 12, 15, 20 — the 12
makes the increment depend on where you are standing. This unstalls the lateral raise without
any new hardware. Supersedes v1.6, below.

Version 1.6 · 27 Aug 2026 — library slots corrected (`quad_unilateral` split out of
`quad_isolation`), belt-loaded dip and pull-up added as separate ids, §7's inheritance now
reads the reference week among loading weeks only, and two `[revisit]` items discharged.
**Two parts of the v1.6 amendment are deliberately not applied:** the §2 per-exercise `step`
overrides, which are blocked on hardware that does not exist (no 1.25 lb add-on plates), and
§13's mesocycle lifecycle, which is scheduled separately. Supersedes v1.5, below.

Version 1.5 · 25 Aug 2026 — §1's reference week steps back past weeks with no logged
sets, so skipping an exercise no longer erases its history. Supersedes v1.4, below.

Version 1.4 · 22 Aug 2026 — §5.1 states the engine return contract for the first time, and
§12's vector table splits `Expected` into class and outcome columns. Documentation only: no
rule, expectation or schema change. Supersedes v1.3 (§4 proportionality scoping, §7.1 assist
deload, §12 audit rule), v1.2 (load sense: §5 dispatch, §6.1–§6.3, §7 deload cascade, §9
`PAIN` text), v1.1 (§4 jump feasibility gate) and v1.0 (flat 10% threshold).

This document defines the load progression rules for the meso tracker. It is written
to be encoded verbatim. Every rule is deterministic given the stored data. Items
marked **[revisit]** are deliberate simplifications, not oversights.

**Scope note:** this specifies *load* progression only. Per-week set counts continue
to come from PROGRAM. Feedback-driven *volume* progression (adding or removing sets
in response to recovery) is a separate mechanism and is **not specified here**. Do not
infer it. **[revisit]**

---

## 1. Definitions

Evaluated per `(week, day, exerciseId)`.

| Term | Definition |
|---|---|
| `range.bottom`, `range.top` | Rep range for the exercise's slot (or exercise-level override) |
| `qualifyingSets` | Logged sets where `reps` is a number > 0. The `done` checkbox is a UI affordance and is **ignored** for evaluation |
| `n` | `qualifyingSets.length` |
| `first` | `qualifyingSets[0]` |
| `last` | `qualifyingSets[n-1]` |
| `prescribed` | Set count from PROGRAM for that week |
| `workingLoad` | The weight value, if identical across all qualifying sets |
| `mixedLoad` | True when qualifying sets do not all share one weight |
| `step` | Smallest load increment achievable from the current load (see §2). Derived from the rack where one is defined, otherwise the equipment default |
| `jumpPct` | `step / workingLoad` |
| `feedback.effort` | `"easy"` / `"right"` / `"brutal"`. Absent → treat as `"right"` |
| `feedback.pain` | Boolean joint-pain flag. Absent → false |
| `loadSense` | `"weight"` (default), `"none"`, or `"assist"`. Library field. Absent → `"weight"` |

A suggestion for week *N* is computed from the **reference week**: the most recent prior
week holding qualifying sets for the same `(day, exerciseId)`. That is normally *N−1*, but
it steps further back when a week was skipped or never logged, so setting an exercise aside
for a week does not erase what came before it. Where no prior week holds any, the exercise
is treated as new and resolves to `NO_DATA` (§9).

`prescribed` and `feedback` are read from the reference week too, not from *N−1*. Suggestions
are never computed from a different exerciseId.

**Decided, not deferred (v1.6):** an older reference is not a like-for-like comparison — the
RIR target tightens 3 → 2 → 1 across the block, so reps recorded two weeks back were performed
further from failure and the suggestion errs easy. No compensation is applied. Correcting for
the RIR gap would stack a reps-per-RIR conversion on top of §4's reps-per-percent heuristic,
two approximations multiplied together, on a path that only fires after a skipped week. The
cost of erring easy is one light suggestion that §8 corrects the following week.

**A skip does not hide sets that were already logged.** The reference week walks back only
where nothing qualifying was recorded. This holds for a single-exercise skip and a whole-day
skip alike; they are the same rule seen at different scales.

*Decided (v1.8), not deferred. Do not re-litigate without new evidence.* Rationale, recorded
so the reasoning survives:

- **Skip and delete already express different things.** Clearing the fields removes sets from
  evaluation entirely. That gesture is available and unambiguous. "I left the gym" and
  "disregard what I did" are different statements, and only the second is about the data.
  Making a skip suppress logged sets would collapse the two and remove the ability to say the
  first alone.
- **Suppression is worse-informed.** Where a partial week exists, it is the most recent
  evidence about that exercise at that load. Discarding it to read an older week substitutes
  stale information for fresh, and surfaces a reference load the athlete has since moved past.
- **`INCOMPLETE` already declines to progress**, which is the conservatism suppression would
  be reaching for. It is the floor: fuller data can produce `ADD`, partial data cannot.
- **Per-exercise reference weeks may diverge within one day.** Exercises completed before a day
  was abandoned read that week; the rest read further back. This is correct rather than merely
  tolerated — each exercise progresses on its own evidence, and the day is not an evaluative
  unit. Uniformity is not a goal worth paying information for.

**Watch item (v1.8), not a `[revisit]`:** §1 ignores the `done` flag, so reps typed but not
performed still count, and an abandoned session makes that marginally more likely. Retained
unchanged — forgetting to tick checkmarks is the higher-frequency error, and having it erase a
logged session is the worse failure. Actionable only if a real instance occurs.

**Warm-up sets are recorded but never read here.** They live in their own store and no rule in
this document consults them. That isolation is the point: a ramp logged as working sets is
exactly what §11's `MIXED` rule exists to reject. Decided (v1.6) that they stay a record only —
checking a working load against the last warm-up would fire on every exercise every session and
change no decision, since a legitimate jump is indistinguishable from an error without intent.

Storage: `feedback|{week}|{day}|{exerciseId}` → `{effort, pain}`.

**Library assignments.** These entries carry `loadSense`; every other exercise omits the
field and defaults to `"weight"`.

| Exercise id | loadSense |
|---|---|
| `pushup` | `none` |
| `pullup` | `none` |
| `dip_chest` | `none` |
| `dip_triceps` | `none` |
| `back_extension_45` | `none` |
| `pullup_assisted` | `assist` |

**Decided (v1.6):** belt-loaded dips and pull-ups are separate library entries,
`dip_weighted` and `pullup_weighted`, carrying the default `weight` sense. No fourth load
sense is needed. Separate ids are correct rather than convenient: adding a belt changes the
exercise and the rep counts are not comparable, so history should not transfer between them.

---

### 1.1 Block length

| Term | Definition |
|---|---|
| `blockLength` | Number of weeks in the block's PROGRAM. Per block, never global |
| `deloadWeek` | `blockLength` — the final week |
| `loadingWeeks` | Weeks `1 … blockLength − 1` |
| `lastLoadingWeek` | `blockLength − 1` |

**The deload is the final week, determined by position.** Not flagged in PROGRAM; a flag would
be a second source of truth. `blockLength ≥ 2`. **[revisit]** Every block ends in exactly one
deload week.

Seeding and the deload cascade read the `blockLength` of **the block whose weeks they are
walking**, not the active block's. Seeding Meso 02 from Meso 01 walks 3 … 1; seeding Meso 03
from a five-week Meso 02 walks 4 … 1.

Meso 01 remains four weeks and must render and evaluate as four weeks.

---

## 2. Load increment table

The increment is the **smallest step physically available** on that equipment. Where
that step is disproportionate to the working load, §4's gate handles it — do not
invent smaller increments.

| Equipment | Step | Notes |
|---|---|---|
| Barbell (all lifts, upper and lower) | **+5 lb total** | Pair of 2.5s. No upper/lower distinction — the gate in §4 handles proportionality better than a category rule would |
| Dumbbell | **+5 lb per dumbbell** | Next size on the rack. Rack goes past 80 lb, so no ceiling concern |
| Cable | **+10 lb** | One pin |
| Machine | **+10 lb** | One pin |
| Bodyweight | **n/a** | Progresses by reps only (§6) |

**Category defaults are assumptions about equipment, not facts about it.** Machine and
cable stacks are taken to move in 10 lb increments and barbells in 5 lb because that
is typical, not because these particular machines were measured. A per-exercise `step`
override records a **measured** property of a specific machine and must state how it
was established.

No exercise currently carries a step finer than its category default. The Machine Flye
previously carried `step: 2.5`, justified by a 72.5 lb figure said to appear in logs
that predate the tracker and cannot be checked. The machine takes 10 lb plates and
nothing finer. The override is removed and the Machine default applies.

The override mechanism remains in use elsewhere and is not deprecated.

### Measured consequence at v1.9

Machine Flye, 10–15 range, at the top of range on every set:

| Load | Jump | v1.9 gate |
|---|---|---|
| 70 and above | ≤ 14.3% | Passes — `70 ✓ → try 80` |
| 60 | 16.7% | Demands 16 reps against a top of 15 |
| 50 | 20% | Demands 17 |
| 40 | 25% | Demands 19 |

The flye starts at 70 and is unaffected while it climbs. Below 70 it is stranded,
demanding reps past the top of its own range — the condition §4 v2.0 exists to remove.

### Equipment audit — pending, before Meso 02

One datum in this table was wrong on unverifiable grounds. The rest rests on the same
footing: category defaults, never measured.

| Equipment | Assumed | Exercises |
|---|---|---|
| Machines | +10 | Machine Flye, Leg Extension, Seated Leg Curl |
| Cables | +10 | Triceps Pushdown, Rope Facepull, Lat Pulldown, Rear Delt Flye |
| Barbell | +5 | Confirm 2.5 lb plate pairs exist at both gyms |
| Assisted pull-up | +10 | Confirm stack increment |

The dumbbell rack is already modelled from observation (v1.7) and needs no re-check.

Record each as a dated line stating that it was physically verified. Where a measurement
contradicts the category default, add a `step` override carrying the same note.

**This should precede Meso 02's PROGRAM.** A cable stack that turns out to be 5 lb rather
than 10 changes the gate arithmetic for that exercise, which changes whether it can
progress, which is an input to choosing exercises and set counts for the next block.

#### Verified 22 Sep 2026 — the six category defaults, all confirmed

**How they were established:** checked at the equipment, per machine rather than per exercise,
since several exercises share a stack. For each, two questions — the gap between adjacent
plates, and whether any add-on or half-pin permits a finer step.

| Checked | Assumed | Result | Exercises riding on it |
|---|---|---|---|
| Cable columns | +10 | **Confirmed** | Rope facepull, rope pushdown, low-to-high flye, rear delt flye, pull-through, cable curl |
| Lat pulldown stack | +10 | **Confirmed** | Neutral-grip pulldown |
| Machine flye | +10 | **Confirmed** | Machine flye |
| Leg extension | +10 | **Confirmed** | Leg extension |
| Seated leg curl | +10 | **Confirmed** | Seated leg curl |
| Barbell plates, both gyms | +5 | **Confirmed** — 2.5 lb pairs exist | Squat, good morning |

**No override was added, because none was needed.** That is the outcome the audit existed to
establish rather than assume: before it, every one of these rows was a category default nobody
had measured, which is exactly the footing that made `step: 2.5` on the machine flye wrong.
They are now measured and they happen to agree.

The dumbbell rack was already modelled from observation (v1.7) and was not re-checked.

#### Verified 22 Sep 2026 — EZ bar, step 10

**How it was established:** observed in use during Meso 01 week 3. The EZ bars carry no 5 lb
increment, and the curl went 40 → 50 rather than 40 → 45, because 45 was not available to
load. Reported by the lifter who loaded it.

`step: 10` is therefore set on `ez_preacher_curl`, `ez_curl_wide`, `ez_curl_narrow` and
`skull_crusher`, overriding the Barbell default of +5. Two of the four are in the Meso 01
PROGRAM; all four are in the library and eligible for substitution, so all four carry it.

**Resolved 22 Sep 2026.** The EZ bars are **fixed-weight, at 10 lb intervals** — his
observation, standing at them. So they are a rack, but an evenly spaced one, and for an evenly
spaced rack a scalar `step` and a `rack` produce identical arithmetic everywhere except the
ends. `step: 10` stands.

**One thing a scalar cannot express, and it is still open:** a fixed-weight rack has a
heaviest bar. A scalar step will happily suggest a load past the end of the rack, where a
`rack` list would stop. The lightest and heaviest bar are not recorded, so that ceiling is
currently unmodelled. It bites only if an EZ movement climbs to the top of the rack, which on
current loads (40 and 45) is some way off — but it should be written down at the next visit
rather than discovered by a suggestion for a bar that does not exist.

**Non-uniform racks.** A single `step` per exercise assumes evenly spaced loads. The
dumbbell rack is not evenly spaced: it runs 10, 12, 15, 20, 25 and upward in fives, so the
increment depends on the load you are holding — 2 from the 10s, 3 from the 12s, 5 from the
15s. Where a rack is defined, `step` is derived from it rather than assumed:

```
stepUp   = (smallest rack load greater than workingLoad) − workingLoad
stepDown = workingLoad − (largest rack load less than workingLoad)
```

`stepUp` drives `jumpPct`, the §4 gate and `ADD`. `stepDown` drives `REDUCE`, so a
reduction also lands on a load that exists. Where the rack runs out in either direction,
the equipment default applies. A deload (§7) snaps to the largest rack load at or below the
computed figure, for the same reason.

This is a statement about equipment, not about training. It replaces what would otherwise
be a per-exercise `step` override that is correct at one load and wrong at the next: a flat
`step: 2` is right from the 10s and would prescribe a 14 lb dumbbell from the 12s.

**Direction of progression.** Which way a step moves depends on `loadSense`:

| loadSense | Progress (ADD) | Regress (REDUCE) | Floor |
|---|---|---|---|
| `weight` | `load + step` | `load − step` | one `step` |
| `assist` | `load − step` | `load + step` | `0` (unassisted) |
| `none` | no load arithmetic | no load arithmetic | — |

`pullup_assisted` uses `step: 10` (machine stack).

**Double-step clause:** if `jumpPct < 3%` AND performance is `P_PASS` AND
`first.reps >= range.top + 2`, suggest **two** steps instead of one. This only fires
at loads heavy enough that a single step is trivial. At current loads it will
essentially never fire; it exists so the rule doesn't stall in a year. Applies only
where `jumpPct` is defined. See §4.

**Rounding:** compute, then round **down** to the nearest achievable multiple of
`step`. Never suggest a load below one `step`.

---

## 3. Performance classification

Evaluate in this order. First match wins. Mutually exclusive and exhaustive for `n ≥ 1`.

| Class | Condition |
|---|---|
| `P_FAIL` | `first.reps < range.bottom` |
| `P_DROP` | `last.reps < range.bottom` |
| `P_PASS` | `first.reps >= range.top` |
| `P_HOLD` | otherwise (`first.reps` inside range) |

Rationale, for whoever maintains this: **set 1 reports whether the load is
appropriate; the last set reports whether the fatigue is manageable.** Under RIR-capped
sets a declining rep count across sets is correct execution, not failure — 12/11/9 at
a 2 RIR cap is a well-run exercise and passes. Requiring the top of the range on every
set would require sandbagging the early sets.

---

## 4. Landing feasibility gate

Applied only when the class is `P_PASS` and `loadSense` is `"weight"`.

```
estimatedRepLoss = ceil(jumpPct / 0.03)
estimatedLanding = first.reps - estimatedRepLoss
landingFloor     = ceil(range.bottom / 2)

if estimatedLanding >= landingFloor:
    class remains P_PASS
else:
    requiredReps = landingFloor + estimatedRepLoss
    ceiling      = range.top + 6
    if requiredReps > ceiling:  class = P_UNPROGRESSABLE
    else:                       class = P_GATED
```

The gate asks a single question: **after taking the smallest available increment, is set 1
still a productive working set for this slot?** It does not ask whether the athlete retains a
buffer, and it does not require the prescribed range to be exceeded.

### Survey — 22 Sep 2026

**PROGRAM:** Meso 01, as shipped. **Increments:** as of v2.3, every one measured at the
equipment. **Gate versions:** v1.9 computed from its own formula, since the engine no longer
runs it; v2.0 cross-checked against the live engine, which agreed on every row.

**Loaded** means: not bodyweight, a numeric rep range, and a PROGRAM `start` value. Six of the
nineteen exercises fail that test — one bodyweight, five with no `start` — leaving **13**.

**Each evaluated at** its PROGRAM start load, hitting the top of its range on every set, week 2
at 2 RIR. `stepUp` resolved as §2 resolves it: from the rack where one applies, otherwise the
scalar step.

| Exercise | Load | Step | Range | v1.9 | v2.0 |
|---|---|---|---|---|---|
| Incline Dumbbell Press | 25 | +5 | 8–12 | `P_GATED` needs 15 | `P_PASS` |
| Dumbbell Shoulder Press | 25 | +5 | 8–12 | `P_GATED` needs 15 | `P_PASS` |
| Machine Flye | 70 | +10 | 10–15 | `P_PASS` | `P_PASS` |
| Cable Triceps Pushdown | 60 | +10 | 10–15 | `P_GATED` needs 16 | `P_PASS` |
| Dumbbell Lateral Raise | 10 | +2 | 12–20 | `P_PASS` | `P_PASS` |
| Cable Rope Facepull | 50 | +10 | 12–20 | `P_PASS` | `P_PASS` |
| Barbell Squat | 85 | +5 | 8–12 | `P_PASS` | `P_PASS` |
| EZ Bar Preacher Curl | 45 | +10 | 10–15 | `P_GATED` needs 18 | `P_PASS` |
| Dumbbell Curl (Incline) | 15 | +5 | 10–15 | `P_UNPROGRESSABLE` | `P_GATED` |
| Leg Extension | 45 | +10 | 15–20 | `P_GATED` needs 23 | `P_PASS` |
| Dumbbell Upright Row | 20 | +5 | 10–15 | `P_GATED` needs 19 | `P_PASS` |
| Barbell Good Morning | 65 | +5 | 10–12 | `P_GATED` needs 13 | `P_PASS` |
| EZ Bar Curl (Wide) | 40 | +10 | 10–15 | `P_GATED` needs 19 | `P_PASS` |

**v1.9 held 9 of 13. v2.0 holds 1.** Every "needs" figure above is past the top of that
exercise's own range — which is the defect, stated as a count.

**This cannot be reconciled with the "six of fourteen" it replaces**, and no attempt is made
to. That figure was taken before the machine flye lost its 2.5 lb override and before the EZ
bars gained their 10 lb one, so it was measuring different equipment; its denominator of 14
also implies a different "loaded" test from the one stated here. Both are honest measurements
of different things. This is why §12 now requires the inputs.

The one exercise v2.0 still holds is the incline dumbbell curl at 15 with a 5 lb step — a 33%
jump, which is genuinely large, and it is not in Meso 02.

`landingFloor` is half the range bottom because rep ranges differ by slot for reasons that
survive a load increase. A high-rep lateral raise slot exists because heavy lateral raises stop
being lateral raises; an 8–12 press slot has no such constraint. A proportional floor respects
that, where a fixed rep offset would not.

**Why the v1.1 gate was replaced.** The arithmetic was never the defect —
`ceil(jumpPct / 0.03)` tracks a standard rep-max relationship closely. The premise was. Requiring
set 1 to clear the range *bottom* after the jump means holding a large rep buffer *before* it,
and on a coarse increment that buffer exceeds the top of the range, as the survey below
measures. The top of a rep range is the signal to add load — a
rule that requires exceeding it contradicts the definition of the quantity it reads. Double
progression has always run the other way: reach the top, add load, watch reps fall, climb back.

**`REDUCE` is a one-way door under v1.9.** A coarse increment makes `REDUCE` non-reversible.
Machine Flye reduced from 70 to 60 lands on a load the v1.9 gate will not let it leave:
escaping 60 requires 16 reps against a range top of 15. The exercise is not stranded by a
deload — §7 produces no suggestions in week 4 and §13.2 seeds from loading weeks — but by an
ordinary failed week.

This is structural rather than an edge case: on any exercise where the increment exceeds
roughly 15% of the reduced load, v1.9 can move a load down and then refuse to move it back. It
is the clearest argument for shipping v2.0 without further delay.

**Ship date unchanged: alongside Meso 02.** The exposure window is two sessions and requires a
failed week to open. Do not accelerate; do not let it slip further.

**[revisit]** Half is a threshold, not a derivation. It was chosen to clear the PROGRAM while
still blocking a three-rep landing in a 12–20 slot. **Verified after merging: it clears 13 of
14, not all 14.** `db_curl_incline` at 15 in a 10–15 slot still gates at `need 17+ before 20` —
a 33% jump costing an estimated 12 reps lands at 3 against a floor of 5. It does improve, since
v1.9 called that same case `P_UNPROGRESSABLE`. Recorded because the amendment stated the
stronger claim.

`P_UNPROGRESSABLE` means the smallest available increment cannot be absorbed by this slot at
this load. It remains a hold, not an error, and now fires only for genuinely coarse increments —
above roughly 40–60% of the working load depending on the range.

Text:

| Class | Suggestion text |
|---|---|
| `P_GATED` | `repeat {load} — need {requiredReps}+ before {load+step}` |
| `P_UNPROGRESSABLE` | `{step} is too big a jump here — hold {load} and add reps` |

In §8, `P_UNPROGRESSABLE` × any effort → hold, using the text above.

**Proportionality rules apply only to `loadSense: "weight"`.**

Both the §2 double-step clause and the §4 jump feasibility gate compute from
`jumpPct`. That quantity is undefined for `"none"` (there is no load) and
meaningless for `"assist"` (the rep cost of removing assistance scales with
bodyweight, not with the assist figure). Where `jumpPct` is undefined, neither
rule is evaluated: the gate is skipped and the double-step clause never fires.

This is a single statement governing both rules. It is not a policy choice — a
rule whose input is undefined cannot be evaluated.

**[revisit]** A bodyweight-aware gate for assisted work is possible but requires a
stored bodyweight, which would mean a schema change.

Note for implementers: at `step: 10` the double-step clause would require assistance
above 333 lb to satisfy `jumpPct < 3%`. It is unreachable in practice regardless of
scope. The scoping exists so the rule is stated rather than assumed.

---

## 5. Evaluation order

```
sense = exercise.loadSense ?? "weight"
```

Dispatch on `sense` first, before any data-shape rule. Each sense has its own ordered
list; within a list, first match wins and later rules do not run.

- `"none"` → §6.1
- `"assist"` → §6.2
- `"weight"` → §6.3

Dispatching on load sense ahead of the data-shape rules is structural, not a
reordering: the engine otherwise assumes load is a scalar where a higher number means a
harder set, which is false for both bodyweight (no meaningful load) and assisted work
(higher number is easier).

### 5.1 Engine return contract

Every path through §6 terminates in a return of this shape:

```
{
  class:   one of P_FAIL | P_DROP | P_PASS | P_HOLD | P_GATED |
           P_UNPROGRESSABLE, or null
  outcome: one of ADD | HOLD | HOLD_GATE | HOLD_RIR | HOLD_PUSH | REDUCE |
           DELOAD | DELOAD_BW | DELOAD_ASSIST | NO_DATA | NO_DATA_BW |
           PAIN | PAIN_BW | PAIN_ASSIST | MIXED | INCOMPLETE |
           INCOMPLETE_BW | BW_PROGRESS
  load:    number, or null where the sense or outcome names no load
  text:    the exact user-facing string
}
```

**`class` is non-null if and only if `outcome` came from the §8 matrix.** Every
non-matrix outcome short-circuits within §6 before §3 classification runs, and
returns `class: null`. This is an invariant, not a convention — an implementation
that returns a class alongside `PAIN` or `MIXED` has run classification it should
have skipped.

`class` and `outcome` are distinct vocabularies and are not interchangeable.
`class` describes what the reps showed; `outcome` describes what the app says to
do. Several classes map to the same outcome — `P_DROP`, `P_HOLD` and
`P_UNPROGRESSABLE` all produce `HOLD`.

---

## 6. Progression by load sense

### 6.1 Sense `none`

Load is ignored entirely. Progression is by reps.

| # | Condition | Outcome | Text |
|---|---|---|---|
| 1 | Current week is `deloadWeek` | `DELOAD_BW` | `deload — stop 4–5 shy of failure` |
| 2 | `feedback.pain` set last week | `PAIN_BW` | `pain flagged — go easier or swap the movement` |
| 3 | No qualifying sets in prior week | `NO_DATA_BW` | `2 shy of failure` |
| 4 | `n < prescribed` | `INCOMPLETE_BW` | `beat {last.reps} — {n} of {prescribed} sets logged` |
| 5 | Otherwise | `BW_PROGRESS` | `beat {last.reps} on the last set` |

Row 3 is authoritative: bodyweight with no history returns `2 shy of failure`, **not**
the generic `NO_DATA` text.

**[revisit]** Past roughly 25 reps on the last set, added load or a harder variant is
the correct progression. Not specified; the app stays silent and you decide.

### 6.2 Sense `assist`

The stored number is assistance. Lower is harder. §3 classification is unchanged — it
reads reps only and is sense-agnostic.

| # | Condition | Outcome | Text |
|---|---|---|---|
| 1 | Current week is `deloadWeek` | `DELOAD_ASSIST` | see §7.1 |
| 2 | `feedback.pain` set last week | `PAIN_ASSIST` | `pain flagged — more assistance or swap the movement` |
| 3 | No qualifying sets in prior week | `NO_DATA` | `find it — {top} reps, {rir} in reserve` |
| 4 | `mixedLoad` | `MIXED` | `pick one assist level and hold it` |
| 5 | `n < prescribed` | `INCOMPLETE` | `repeat {load} assist — {n} of {prescribed} sets logged` |
| 6 | Otherwise | §3 classification → §8 matrix, gate skipped | see below |

Matrix text for `assist`:

| Outcome | Text |
|---|---|
| `ADD`, `load − step > 0` | `{load} ✓ → drop assist to {load − step}` |
| `ADD`, `load − step <= 0` | `{load} ✓ → try it unassisted` |
| `ADD`, `load == 0` already | `unassisted — switch to Pull-Up` |
| `REDUCE` | `add assist to {load + step} — {bottom}+ clean` |
| `HOLD_RIR` | `repeat {load} assist — same reps, more in reserve` |
| `HOLD_PUSH` | `repeat {load} assist — take it closer to {rir} RIR` |
| `HOLD` | `repeat {load} assist — chase {top}+` |
| `HOLD_GATE` | not reachable — gate is skipped for `assist` |

Row 1 uses `+ step` rather than §7's ×0.70 multiplier, which runs the wrong direction
for inverted load. **[revisit]** One step of added assistance is a guess at deload
magnitude for this sense.

`ADD` at `load == 0` means the exercise has outgrown its assist sense; the text points
at the unassisted library entry rather than attempting arithmetic below the floor.

### 6.3 Sense `weight`

| # | Condition | Outcome |
|---|---|---|
| 1 | Current week is `deloadWeek` | `DELOAD` (§7) |
| 2 | No qualifying sets in prior week | `NO_DATA` |
| 3 | `feedback.pain` set last week | `PAIN` |
| 4 | `mixedLoad` | `MIXED` |
| 5 | `n < prescribed` | `INCOMPLETE` |
| 6 | Otherwise | §3 classification → §4 gate → §8 matrix |

---

## 7. Deload behaviour (the deload week)

- **No progression suggestion is ever produced during the deload week**, regardless of
  feedback or performance.
- **Deload-week feedback is recorded but not acted on.** It exists for your reading, not
  the algorithm's.
- **Next mesocycle inheritance:** week 1 of a new meso inherits, per exercise id, the
  `workingLoad` of the **reference week among loading weeks only** — the most recent
  loading week of the outgoing block holding qualifying sets for that exercise. The deload
  week is excluded: inheriting from a deload would seed the next block roughly 30% light. **No increment is applied** — a
  fresh block opens at 3 RIR, so the same load will feel easy for one week and §8 will add
  on its own evidence in week 2; opening a step higher risks starting above what week 1's
  RIR target supports, and one easy week costs nothing. *(Decided v1.6, discharging the
  v1.1 `[revisit]`.)* If no loading week holds qualifying sets, inheritance falls to the
  prior meso's PROGRAM `start` for that exercise, then to none.

**Deload load, sense `weight`.** Resolves the case where the last loading week has no
computable working load:

```
deloadBase =
  1. lastLoadingWeek workingLoad, if computable
  2. else the most recent prior loading week, walking lastLoadingWeek-1 down to 1,
     with a computable workingLoad
  3. else the PROGRAM start value for this exercise
  4. else none
```

If a base exists:

```
deloadLoad = max(step, floor(deloadBase * 0.70 / step) * step)
text: `{deloadLoad} — {rir} RIR, stop early`
```

If no base exists:

```
text: `about two-thirds of your usual — {rir} RIR, stop early`
```

Sense `assist` takes its own deload row (§6.2 row 1); sense `none` takes §6.1 row 1.

### 7.1 Deload under sense `assist`

Mirrors §7's cascade with the multiplier replaced by a single added step, since
assistance runs the opposite direction from load.

```
assistDeloadBase =
  1. week 3 workingLoad, if computable
  2. else the most recent prior week (2, then 1) with a computable workingLoad
  3. else the PROGRAM start value for this exercise, if present
  4. else none
```

If a base exists:

```
assistDeloadLoad = assistDeloadBase + step
text: `{assistDeloadLoad} — {rir} RIR, stop early`
```

If no base exists:

```
text: `deload — more assistance, stop early`
```

Rung 3 will normally be absent: assisted exercises are reachable only by swap and
are not in PROGRAM. It is retained so the cascade matches §7 structurally rather
than forking a second shape to maintain.

**[revisit]** One added step is a guess at deload magnitude for this sense, and no
upper bound is enforced — the machine's maximum assistance is unknown to the app.

---

## 8. Decision matrix

`P_FAIL` ignores feedback entirely — if set 1 is below the bottom of the range, the
load is wrong regardless of how it felt.

| Performance | Effort | Outcome | Suggestion text |
|---|---|---|---|
| `P_PASS` | easy | `ADD` | `{load} ✓ → try {load+step}` |
| `P_PASS` | right | `ADD` | `{load} ✓ → try {load+step}` |
| `P_PASS` | brutal | `HOLD_RIR` | `repeat {load} — same reps, more in reserve` |
| `P_GATED` | easy | `HOLD_GATE` | `repeat {load} — need {top+2}+ before {load+step}` |
| `P_GATED` | right | `HOLD_GATE` | `repeat {load} — need {top+2}+ before {load+step}` |
| `P_GATED` | brutal | `HOLD` | `repeat {load} — chase {top}+` |
| `P_UNPROGRESSABLE` | any | `HOLD` | `{step} is too big a jump here — hold {load} and add reps` |
| `P_HOLD` | easy | `HOLD_PUSH` | `repeat {load} — take it closer to {rir} RIR` |
| `P_HOLD` | right | `HOLD` | `repeat {load} — chase {top}+` |
| `P_HOLD` | brutal | `HOLD` | `repeat {load} — chase {top}+` |
| `P_DROP` | easy | `HOLD` | `repeat {load} — chase {top}+` |
| `P_DROP` | right | `HOLD` | `repeat {load} — chase {top}+` |
| `P_DROP` | brutal | `HOLD` | `repeat {load} — chase {top}+` |
| `P_FAIL` | any | `REDUCE` | `drop to {load−step} — {bottom}+ clean` |

**[revisit]** `P_DROP` + `brutal` on the same exercise two weeks running is the
clearest signal in the data that weekly volume exceeds recovery. The correct response
is removing a set, which the volume system would own. For now it is indistinguishable
from an ordinary hold.

---

## 9. Non-matrix outcomes

| Outcome | Trigger | Suggestion text |
|---|---|---|
| `DELOAD` | Week 4 | `{deloadLoad} — {rir} RIR, stop early` |
| `NO_DATA` (start weight exists) | No prior sets, PROGRAM has `start` | `start {start}` |
| `NO_DATA` (no start weight) | No prior sets, no `start` | `find it — {top} reps, {rir} in reserve` |
| `PAIN` | Prior week pain flag, sense `weight` | `pain flagged — go lighter or swap the movement` |
| `MIXED` | Loads differ within the exercise | `pick one weight and hold it` |
| `INCOMPLETE` | Fewer qualifying sets than prescribed | `repeat {load} — {n} of {prescribed} sets logged` |

The `PAIN` text carries **no load number**, which resolves the mixed-load case by making
it moot. Naming a specific weight was never useful here — the suggestion is to go
lighter, not to go to a particular number — and when loads were mixed the number being
named was usually a warm-up set.

`PAIN` never increases load under any performance class. It is an unconditional
override sitting above the matrix. Senses `none` and `assist` have their own pain rows
(§6.1 row 2, §6.2 row 2).

A **swapped-in exercise has no history** and therefore resolves to `NO_DATA`. Load is
never inherited across different exerciseIds — a cable pull-through and a barbell good
morning share a slot but not a working weight.

**[revisit]** Two consecutive pain-flagged weeks on one exercise should probably
escalate to a more insistent swap prompt. Currently both weeks read identically.

---

## 10. UI placement

- The suggestion renders **once per exercise card**, above the set rows, replacing
  nothing. Per-set ghost text (last week's numbers) stays exactly as it is.
- The effort tap and pain flag appear **after the last set row** of each exercise,
  near the existing note field. Three effort options plus a separate pain toggle —
  pain is not mutually exclusive with effort.
- Feedback is **optional**. A missing effort value is treated as `"right"`. Never
  block logging or nag for it.
- **The three options are labelled `TOO LIGHT` / `JUST RIGHT` / `TOO HEAVY`.** The stored
  values remain `easy` / `right` / `brutal`, unmigrated, and every rule in this document
  reads the stored value. The labels changed because the question is about **overshoot
  relative to the RIR target**, not about how hard the set was.

  **The session report uses the labels, not the stored values** — it reads `felt too heavy`,
  and its own "how to read this" preamble names the three labels. The report is a display
  surface: the words a reader sees should be the words the lifter was answering.

  A consequence worth knowing: the report renders stored values through the *current* labels,
  so re-reporting a Meso 01 day now shows it in the new vocabulary even though it was
  collected under the old one.

  **Feedback collected before Meso 02 is not directly comparable to feedback after it.** It
  was taken under the old labels, where `brutal` read as severity rather than overshoot and
  was under-used in consequence: a set can be both hard and correctly loaded, and the old
  wording invited "no, it wasn't brutal" where the new wording asks a question the lifter
  can answer. Any comparison of effort distributions across that boundary is measuring the
  wording as much as the training.
- Suggestion text is short by design. It is read mid-session, one-handed, between
  sets.

---

## 11. Known interactions worth remembering

**RIR ramp inflates apparent progress.** Targets tighten 3 → 2 → 1 across the block,
so the same load produces more reps in week 3 than week 1 through intensity alone.
Expect load increases to cluster in weeks 2–3. This is the design working, not
strength appearing from nowhere.

**The `MIXED` rule is doing real work.** The prior mesocycle logs contain ascending
ramps recorded as working sets — squat at 65×12, 95×7, 85×10 in one session. Those
are warm-ups, and they make performance unevaluable. `MIXED` exists to name that
rather than silently computing nonsense from it.

---

## 12. Acceptance vectors

**Amendments must audit this table.** Every amendment declares which existing
vectors it changes, in a "Vectors changed" section. An amendment may not assert
that all prior vectors pass unchanged without having checked each one against its
own replaced sections.

This rule exists because v1.2 asserted exactly that while replacing §9's PAIN
text, which silently invalidated vector 9. A transcribed table nobody re-checks is
worse than no table: it carries the authority of the specification while drifting
from it.

**A measured claim in this document records how it was measured.** Any figure derived
from surveying the PROGRAM, the library, or logged data must appear as a dated table
with its inputs — date, PROGRAM state, spec version, and the per-item results — not as
a count inside a sentence.

Two claims have now failed this test. `step: 2.5` rested on logs that predate the
tracker and cannot be checked. §4's "six of fourteen loaded exercises" was transcribed
from a survey whose method was not recorded, and a re-run produced seven of thirteen —
a different numerator *and* a different denominator, meaning the exercise set changed
between runs and neither figure can be reconciled after the fact.

A count in prose looks like a fact and is unfalsifiable a week later.

### §4 rationale — re-measured 22 Sep 2026

Done, and recorded in §4 as a dated table with its inputs: the "loaded" test, the load each
exercise was evaluated at, both gate versions, and the per-row results. **v1.9 held 9 of 13;
v2.0 holds 1.**

It was deliberately not run until the §2 equipment audit closed, because a survey is gate
arithmetic and gate arithmetic reads `step`. Two rows moved while the audit was in progress.
Recording a count before the inputs were settled is the failure this rule exists to prevent,
and it would have reproduced it exactly.

Every vector must be deterministic. Where an input omits a value that any rule in
the evaluation order reads — including `prescribed` — the vector is defective and
is fixed, not interpreted.

**Column semantics.** Each vector states an expected `class`, an expected
`outcome`, and the exact expected `text`. A class of `—` means classification did
not run and the engine must return `class: null`.

**The harness asserts all three fields on every row, including `class: null`.**
Asserting null is not a formality: it is what catches classification running on a
path that should have short-circuited. A vector that produces the correct text via
the wrong classification is a failure.

§12 is the source of truth for the vectors. The harness transcribes this table; it
does not define it. Where they disagree, the table is correct and the harness is
wrong.

Every vector must pass. Unless stated, `prescribed` is 3 and effort is `right`.

| # | Input | Expected class | Expected outcome | Expected text |
|---|---|---|---|---|
| 1 | DB 25, 8–12, 12/11/9 | `P_PASS` | `ADD` | `25 ✓ → try 30` |
| 2 | BB 85, 8–12, 12/11/10 | `P_PASS` | `ADD` | `85 ✓ → try 90` |
| 3 | BB 85, 8–12, 12/10/7 | `P_DROP` | `HOLD` | `repeat 85 — chase 12+` |
| 4 | DB 10, 12–20, 20/18/16, easy | `P_GATED` | `HOLD_GATE` | `repeat 10 — need 23+ before 15` |
| 5 | BB 45, 10–15, 15/14/12, brutal | `P_PASS` | `HOLD_RIR` | `repeat 45 — same reps, more in reserve` |
| 6 | Cable 60, 10–15, 8/7/6 | `P_FAIL` | `REDUCE` | `drop to 50 — 10+ clean` |
| 7 | Load 70, 10–15, step 2.5, 15/13/12 | `P_PASS` | `ADD` | `70 ✓ → try 72.5` |
| 8 | BB 65×12 / 95×7 / 85×10 | — | `MIXED` | `pick one weight and hold it` |
| 9 | BB 65, range 8–12, sets 12/11/10, presc 3, pain = true | — | `PAIN` | `pain flagged — go lighter or swap the movement` |
| 10 | Week 4, week-3 load 90, step 5 | — | `DELOAD` | `60 — 4–5 RIR, stop early` |
| 11 | `pushup`, prior last set 12, presc 2, 2 sets logged | — | `BW_PROGRESS` | `beat 12 on the last set` |
| 12 | BB 85, 8–12, 12/11 (2 of 3 logged) | — | `INCOMPLETE` | `repeat 85 — 2 of 3 sets logged` |
| 13 | `pushup`, week 1, no prior data | — | `NO_DATA_BW` | `2 shy of failure` |
| 14 | `pushup`, week 2, prior last set 15, presc 2, logged 2 | — | `BW_PROGRESS` | `beat 15 on the last set` |
| 15 | `pushup`, week 4 | — | `DELOAD_BW` | `deload — stop 4–5 shy of failure` |
| 16 | `pushup`, prior week pain = true | — | `PAIN_BW` | `pain flagged — go easier or swap the movement` |
| 17 | `pushup`, presc 2, 1 set logged, last 12 | — | `INCOMPLETE_BW` | `beat 12 — 1 of 2 sets logged` |
| 18 | `pullup_assisted` 40, 10–15, 15/13/11, step 10 | `P_PASS` | `ADD` | `40 ✓ → drop assist to 30` |
| 19 | `pullup_assisted` 10, 10–15, 15/14/12, step 10 | `P_PASS` | `ADD` | `10 ✓ → try it unassisted` |
| 20 | `pullup_assisted` 0, 10–15, 15/14/12 | `P_PASS` | `ADD` | `unassisted — switch to Pull-Up` |
| 21 | `pullup_assisted` 30, 10–15, 8/7/6, step 10 | `P_FAIL` | `REDUCE` | `add assist to 40 — 10+ clean` |
| 22 | Sense `weight`, 65×12 / 95×7 / 85×10, pain | — | `PAIN` | `pain flagged — go lighter or swap the movement` |
| 23 | Week 4, week 3 unlogged, week 2 load 85, step 5 | — | `DELOAD` | `55 — 4–5 RIR, stop early` |
| 24 | Week 4, no week logged, PROGRAM start 45, step 5 | — | `DELOAD` | `30 — 4–5 RIR, stop early` |
| 25 | Week 4, no week logged, no start value | — | `DELOAD` | `about two-thirds of your usual — 4–5 RIR, stop early` |
| 26 | `pullup_assisted`, week 4, week 3 assist 40 logged, step 10 | — | `DELOAD_ASSIST` | `50 — 4–5 RIR, stop early` |
| 27 | `pullup_assisted`, week 4, week 3 unlogged, week 2 assist 50, step 10 | — | `DELOAD_ASSIST` | `60 — 4–5 RIR, stop early` |
| 28 | `pullup_assisted`, week 4, no prior week logged, not in PROGRAM | — | `DELOAD_ASSIST` | `deload — more assistance, stop early` |
| 29 | `pullup_assisted` 400, range 10–15, sets 17/15/14, right, presc 3, step 10 | `P_PASS` | `ADD` | `400 ✓ → drop assist to 390` |
| 30 | Week 3, week 2 unlogged, week 1 BB 85, 8–12, 12/11/10, presc 3 | `P_PASS` | `ADD` | `85 ✓ → try 90` |
| 31 | Week 3, no prior week logged, no start value | — | `NO_DATA` | `find it — 12 reps, 1 in reserve` |
| 32 | Rack 10/12/15/20, load 10, range 12–20, sets 20/18/16, easy, presc 3 | `P_PASS` | `ADD` | `10 ✓ → try 12` |
| 33 | Rack 10/12/15/20, load 12, range 12–20, sets 20/18/16, presc 3 | `P_PASS` | `ADD` | `12 ✓ → try 15` |
| 34 | Rack 10/12/15/20, load 15, range 12–20, sets 10/9/8, presc 3 | `P_FAIL` | `REDUCE` | `drop to 12 — 12+ clean` |
| 35 | Wk 3. Wk 2 holds no qualifying sets. Wk 1 BB 85, 8–12, 12/11/10, right, presc 3 | `P_PASS` | `ADD` | `85 ✓ → try 90` |
| 36 | Wk 3. Wk 2 skipped, 2 of 3 logged at 90, reps 9/8, presc 3, 8–12. Wk 1 as #35 | — | `INCOMPLETE` | `repeat 90 — 2 of 3 sets logged` |
| 37 | Wk 3. Wk 2 **not** skipped, same 2 of 3 at 90, reps 9/8. Wk 1 as #35 | — | `INCOMPLETE` | `repeat 90 — 2 of 3 sets logged` |
| 38 | Wk 3. Wk 2 skipped, 3 of 3 logged at 90, reps 12/11/10, right, presc 3, 8–12 | `P_PASS` | `ADD` | `90 ✓ → try 95` |
| 39 | `pullup_assisted` 40, 10–15, 2 of 3 logged, reps 14/12, presc 3 | — | `INCOMPLETE` | `repeat 40 assist — 2 of 3 sets logged` |
| 40 | New block wk 1. Outgoing wk 3 held BB 90. New PROGRAM names no `start` | — | `NO_DATA` | `start 90` |
| 41 | New block wk 1. Outgoing wk 3 held BB 90. New PROGRAM names `start` 100 | — | `NO_DATA` | `start 100` |
| 42 | New block wk 1. Exercise absent from outgoing block, no `start`, 10–15 | — | `NO_DATA` | `find it — 15 reps, 3 in reserve` |
| 43 | New block wk 1. Outgoing logged **only** wk 4 at 60. No `start`, 10–15 | — | `NO_DATA` | `find it — 15 reps, 3 in reserve` |
| 44 | New block wk 1. Outgoing wks 1–3 all qualifying: 80, 85, 90. No `start` | — | `NO_DATA` | `start 90` |
| 45 | New block wk 1. Outgoing wk 3 empty, wk 2 held 85, wk 4 held 60. No `start` | — | `NO_DATA` | `start 85` |
| 46 | New block **wk 2**. New block wk 1 held BB 90, 8–12, 12/11/10, right, presc 3 | `P_PASS` | `ADD` | `90 ✓ → try 95` |
| 47 | Incline DB press 25, 8–12, step 5, 12/11/10, right, presc 3 | `P_PASS` | `ADD` | `25 ✓ → try 30` |
| 48 | DB upright row 20, 10–15, step 5, 15/13/12, right, presc 3 | `P_PASS` | `ADD` | `20 ✓ → try 25` |
| 49 | Leg extension 45, 15–20, step 10, 20/18/16, right, presc 3 | `P_PASS` | `ADD` | `45 ✓ → try 55` |
| 50 | BB good morning 65, 10–12, step 5, 12/11/10, right, presc 3 | `P_PASS` | `ADD` | `65 ✓ → try 70` |
| 51 | Load 10, 12–20, step 5, 20/18/16, right, presc 3 | `P_GATED` | `HOLD_GATE` | `repeat 10 — need 23+ before 15` |
| 52 | Load 10, 12–20, step 10, 20/18/16, right, presc 3 | `P_UNPROGRESSABLE` | `HOLD` | `10 is too big a jump here — hold 10 and add reps` |
| 53 | **Five-week block.** Week 4. Ref week 3: `bb_squat_high` 85 × 12/11/10, 8–12, step 5, presc 3, right | `P_PASS` | `ADD` | `85 ✓ → try 90` |
| 54 | Five-week block. Week 5. Week 4: `bb_squat_high` 90 × 10/9/8, step 5, presc 3 | — | `DELOAD` | `60 — 4–5 RIR, stop early` |
| 55 | Five-week block. Week 5. Week 4 unlogged. Week 3: `bb_squat_high` 85 × 12/11/10, step 5, presc 3 | — | `DELOAD` | `55 — 4–5 RIR, stop early` |
| 56 | Five-week block. Week 5. Week 4: `pullup_assisted` assist 40 × 12/11/10, presc 3, step 10 | — | `DELOAD_ASSIST` | `50 — 4–5 RIR, stop early` |
| 57 | Five-week block. Week 5. `pushup` | — | `DELOAD_BW` | `deload — stop 4–5 shy of failure` |
| 58 | New block wk 1, RIR 3. Outgoing block **five weeks**; `bb_squat_high` qualifying in weeks 1–4 at 80, 85, 85, 90. No PROGRAM `start` | — | `NO_DATA` | `start 90` |
| 59 | New block wk 1, RIR 3. Outgoing block five weeks; logged **only** in week 5 at 60. No PROGRAM `start`. Range 10–15 | — | `NO_DATA` | `find it — 15 reps, 3 in reserve` |

Vectors 1–12 originate with v1.0/v1.1. **Vector 9's text was amended by v1.2 §9**, which
removed the load number from `PAIN`. **Vector 11 was amended by v1.3**, which supplied the
`prescribed` value it omitted — without one, §6.1 rows 4 and 5 are indistinguishable — and
the `BW_PROGRESS` outcome name. Vectors 1–8, 10 and 12 are unchanged: all are sense
`weight` on paths v1.2 and v1.3 do not touch, and vector 10's deload resolves at rung 1 of
§7's cascade, never reaching a later rung or §7.1. **v1.4 split every row's `Expected` cell**
across the class and outcome columns — vectors 1, 3, 4 and 5 had stated a class where the
other rows stated an outcome — and changed no expectation.

**v2.2 changed no expectation either, and that is its acceptance test.** For a four-week block
`deloadWeek` is 4, `loadingWeeks` is 1–3 and `lastLoadingWeek` is 3, so every generalised rule
reduces to the form it already had. Any failure among rows 1–52 means a week-literal replacement
was made incorrectly. **Rows 53–59 are new**, all on a five-week block:

- **53 is the guard**, and the row most likely to catch a bad replacement. In a five-week block
  week 4 is a *loading* week, so §6.3 row 1 must not fire. Any surviving `week === 4` test
  returns `DELOAD` here instead of `ADD`.
- **54–57** exercise the deload at week 5 across all three load senses, including the cascade
  stepping back past an unlogged week 4 to week 3 in **55**.
- **58 and 59** seed from a five-week outgoing block: 58 walks its weeks 4–1 and finds 90 in
  week 4, which is a loading week there; 59 confirms week 5 is that block's deload and is
  excluded, leaving nothing to seed.

**Validation is not `suggestLoad`** and does not belong in this table. The harness additionally
asserts that `validateProgram` returns no errors for every entry in `PROGRAMS`, and that a
synthetic five-week PROGRAM carrying one four-length set array returns exactly one error with
§13.7's text.

**v2.1 changed no expectation.** Vector 7's input cell is relabelled from "Machine 70 step
2.5" to "Load 70 … step 2.5": after the Machine Flye correction no library entry carries a step
finer than its category default, so the row no longer describes any exercise. **It is retained**
— it is now the only coverage of that path, and a vector may test a configuration the library
does not contain when it is the sole guard on a mechanism. No spec text was adjusted to suit it,
which is the principle that matters. The relabel matches the synthetic style rows 51 and 52
already use.

**v2.2 corrects v2.1's attribution here.** v2.1 justified that relabel as "matching the treatment
v2.0 already applies to vector 1". No such treatment exists: the instruction to relabel vector 1
lived in the v1.6 amendment, whose library changes were superseded by v1.7's rack model and never
merged. The resolution taken — the synthetic style of rows 51–52 — stands on its own. **Vector 1
is not relabelled**: under v2.0 it reads `ADD` and describes a real library configuration, a
dumbbell press at 25 with the rack stepping to 30. Vector 7 is synthetic because no library
machine carries a 2.5 lb step.

**v2.0 changed rows 1, 4 and 33, and added 47–52.** Every row whose class is `P_PASS`,
`P_GATED` or `P_UNPROGRESSABLE` was re-derived against the new §4, as the amendment required —
15 rows in all; the other 12 were unaffected. **Vector 32 did not change**, though the amendment
listed it as suspect. Rows with `class: —` never reach the gate and were not re-derived.

Row 4 is the sharpest illustration of the change: the same lateral-raise input that v1.1 called
`P_UNPROGRESSABLE` is now merely `P_GATED`. A 50% jump landing at 3 reps in a 12–20 slot is
still refused — the floor is doing work — but it is refused as "not yet" rather than "never".

**Rows 4 and 51 return identical results**, differing only in effort (`easy` against `right`),
because the gate is effort-independent across those two. Both are kept, on the same reasoning
v1.4 gave for keeping 9 and 22: a pair that agrees from different inputs demonstrates the
independence rather than duplicating a check.

Rows 47–50 are the survey cases and are the point of the amendment — a perfect week under the
prescription must progress. All four were confirmed against the live PROGRAM, not just the
harness: under §4 v2.0 the six exercises that v1.9 gated at the top of their range all return
`ADD`.

**v1.9 changed no existing row.** §13 governs block creation and the reference-week boundary,
and no vector 1–39 has a block concept; §14 is a library eligibility change with no engine
rule behind it. Confirmed against the table rather than assumed. Vectors 40–46 are new.
40–45 drive the §13.2 seed and then the engine, so that what is being asserted is where the
seed came from — pre-computing it would collapse 43, 44 and 45 into one row that proves
nothing. **43 is the deload-exclusion case** (week 4 is the only logged week, §13.2 refuses
it, nothing is seeded). **45 confirms the seed's walk-back skips an empty week 3 and still
refuses week 4.** **46 is the guard on §13.3**: the boundary stops a reference week leaving a
block, not weeks referencing each other inside one, and an implementation that over-applies it
returns `NO_DATA` here.

**v1.8 changed the text of vectors 12 and 17 only** — the `INCOMPLETE` family now states the
evidence rather than naming a failure to finish. No class or outcome changed on any existing
row. Vectors 35–39 are new. **36 and 37 are a matched pair and must return byte-identical
results**: that is the v1.8 ruling made mechanical. Note that `skipped` is not an engine
input at all, so at the engine boundary the pair is one input expressed twice; if the rows ever
diverge, someone has wired a skip flag into evaluation, which is exactly what they exist to
catch. **38 is the row most likely to be got wrong** by an implementation that treats a skip as
suppression — a complete week under a skip must progress normally. **39 is the first coverage
of the `assist` `INCOMPLETE` string**, which had none.

Vectors 9 and 22 assert the same text from different inputs — 9 from clean loads, 22 from
mixed. Both are retained: together they demonstrate that `PAIN` overrides regardless of
load shape. The dropped number is not an information loss, since the prior week's loads
remain visible in the per-set ghost text.

Vector 28 is the realistic path: the assisted pull-up is swapped into the vertical-pull
slot during week 3 or 4, so no week under that exercise id carries a working load.

Vectors 32–34 cover the derived rack step: 32 unstalls the lateral raise by stepping to the
12s, 33 shows the increment growing to 3 once you are on them, and 34 reduces onto a load that
exists rather than one that does not. **v1.7 changed no existing vector** — every one of 1–31
passes a scalar `step` and defines no rack, which is still honoured exactly.

Vectors 30 and 31 cover the reference week stepping back: 30 reaches past an unlogged
week 2 to week 1 and suggests from it, 31 finds nothing at all and treats the exercise as
new. **v1.5 changed no existing vector** — every one of 1–29 supplies its data in the week
immediately before `currentWeek`, which the reference week still resolves to first.

Vector 29 is a guard, not a scenario. It satisfies every condition of the double-step
clause except sense — `jumpPct` = 2.5%, `P_PASS`, set 1 at `top + 2` — and must still
suggest a single step. If it returns 380, the §4 scoping was not applied.

Vector 18 demonstrates the gate exclusion: under sense `weight`, `10/40` = 25% would
have triggered `P_GATED`. With the gate skipped for `assist`, it progresses.

Vector 22 must return `PAIN` even though the mixed loads would otherwise route to
`MIXED` — pain sits above mixed-load in the §6.3 order.

Vectors 23 and 24 exercise the fallback cascade: 85 × 0.70 = 59.5, floored to 55;
45 × 0.70 = 31.5, floored to 30.

---

## 13. Mesocycle lifecycle

A mesocycle is a PROGRAM together with its logged data. **The app does not generate a
PROGRAM.** Blocks are designed deliberately outside the app. At transition the app preserves,
seeds, and switches — nothing more.

### 13.1 Creating a block

Creating block *N+1* requires a PROGRAM for it. The action is unavailable without one.

On creation, in order:

1. A new block is added under a fresh id. **Nothing in any prior block is modified, moved or
   deleted.**
2. Starting loads are seeded per §13.2.
3. Carry-over is applied per §13.4.
4. The new block becomes active.

### 13.2 Seeding

Per exercise id, the seed is the working load of the **reference week among loading weeks
only** — the most recent loading week of the outgoing block holding qualifying sets for that
exercise id, per §7. The walk runs the **outgoing** block's `lastLoadingWeek` down to 1, on
that block's own `blockLength`.

The outgoing block's deload week is excluded. Seeding from a deload would open the new block
roughly 30% light.

**An explicit PROGRAM `start` value wins over a seed.** Authoring beats inference: if the next
block names a starting load for an exercise, that is a deliberate decision and the seed does
not override it. Seeding fills only where PROGRAM is silent.

Where no loading week holds qualifying sets and PROGRAM names no start, the exercise begins
unseeded and resolves to the find-it text.

Seeding matches on exercise id alone. A seeded load carries even where the new PROGRAM
prescribes a different rep range for that exercise; week 1 runs at 3 RIR and §8 corrects from
the athlete's own evidence within a week or two.

### 13.3 The block boundary stops the reference week

**§1's reference week does not walk out of a block.** Week 1 of a new block has no reference
week and resolves to `NO_DATA` — `start {load}` where seeding or PROGRAM supplied one, the
find-it text otherwise.

This is a hard boundary, not a preference. Two reasons:

The walk-back searches for the most recent week holding qualifying sets. The outgoing block's
most recent such week is **its deload week**. Left unbounded, week 1 of every new block
would evaluate against deload performance and suggest progression from deload loads.

Restricting the walk to loading weeks would avoid that but is still wrong: §13.2 already
carries the load across. Reading performance across as well would apply the old block's results
to a PROGRAM that may prescribe different sets, reps, or exercise order.

### 13.4 What carries over

| Data | Carries | Rationale |
|---|---|---|
| `order` | **No** | A new block's exercise order is an authoring decision, with priority work placed first. A reorder made during a block is frequently a response to that session's circumstances — a busy machine, a missing bench — and persists because the app stores only the latest arrangement. Carrying it forward would let a situational reorder silently override the next block's design. Same reasoning as `swaps` |
| `swaps` | **No** | A swap says "not what was programmed." The new PROGRAM is authored deliberately — carrying swaps forward would silently override that authoring. If a swapped exercise is wanted, it gets programmed |
| `notes` | **No** | Dated observations tied to a session |
| `sets`, `warmups`, `feedback`, `skips`, `daySkips` | **No** | Results and events, per block by definition |

*Supersedes the v1.9 decision that order carries.* That decision treated order as a durable
preference. Meso 01's evidence says otherwise: its Monday order placed the block's priority lift
third, behind two exercises working the same muscles — an arrangement that, carried forward,
would have undone Meso 02's priority-first design.

Vector-neutral: no vector reads order, and `suggestLoad` never consults it. Confirmed by source
audit — `order` is read only by the display list and written by the reorder sheet and block
creation.

**[revisit]** `notes` conflates two kinds of thing: dated observations, which are per block, and
durable equipment settings — cable height, bench angle, seat position — which are properties of
the exercise at that gym and are lost at every transition. A per-exercise settings field,
carried across blocks, would be the right home. Not specified here.

### 13.7 PROGRAM validation

A PROGRAM is invalid if any of:

| Check | Error text |
|---|---|
| `blockLength < 2` | `{program}: needs at least one loading week and a deload` |
| An exercise's set array length ≠ `blockLength` | `{program} {day} {exerciseId}: {n} set counts for a {blockLength}-week block` |
| An exercise id is not in the library | `{program} {day}: unknown exercise {exerciseId}` |

`validateProgram(program)` returns the list of errors; empty means valid. **Never pad, truncate,
or default a mismatched array.**

Where it runs, and what each surface does with a failure:

| Surface | On failure |
|---|---|
| Vector harness | Validates every PROGRAM in `PROGRAMS`. Any error is a harness failure, reported alongside vector results |
| Block creation (§13.1) | **Refused.** The create action shows the full error list and creates nothing |
| Rendering an existing block | The affected exercise card renders the error text in place of its set rows. Never zero rows silently |

The render case should be unreachable — the other two surfaces catch it first — and exists so
that if it is ever reached, the failure is visible rather than a quietly empty card.

### 13.8 Optional days

A PROGRAM day may carry `optional: true`. Absent means false.

**It changes no rule.** A day that does not happen is a day with no logged sets, and §1's
reference week already walks back past those; §13.2's seed walk does the same. Marking a day
optional adds no engine behaviour, no warning and no prompt — the app must not nag about a day
whose whole point is that it is allowed not to happen.

Its one effect is on the **weekly volume display**, which shows two figures per muscle and
always both:

| Figure | Counts |
|---|---|
| **Core** | Sets on non-optional days only |
| **Total** | Sets on every day |

Core is the volume the block delivers in the weeks the optional day does not happen. Showing
both is how a block is checked for the failure Meso 01 had, where a muscle lived on one day and
that day was logged once in four weeks: if a muscle's core figure is zero, missing the optional
day removes it entirely. Where no day is optional the two figures are equal, which is correct
rather than redundant.

### 13.5 PROGRAM drift

| Case | Behaviour |
|---|---|
| Exercise in new PROGRAM, absent from old | No seed available. PROGRAM `start` if named, else find-it |
| Exercise in old PROGRAM, absent from new | Nothing happens. Its data remains in the old block, untouched |
| Exercise in both, different rep range or slot | Seeded normally per §13.2 |
| Exercise in both, reached only by swap in the old block | Seeded — seeding matches on exercise id, and a swapped-in exercise has its own id and its own logged sets |

### 13.6 Prior blocks are read-only

**Enforced, not defaulted.** Input fields in a non-active block are disabled.

A mis-tap on an old week silently corrupts the evidence used to design later blocks, and there
is no undo. Defaulting to the active block prevents the common case and not the damaging one.

Viewing a prior block does not activate it. Changing which block is active is a deliberate,
confirmed action, and is the only way a prior block becomes writable again.

**[revisit]** Correcting a genuine error in a closed block currently requires reactivating it.
Acceptable while blocks are few.

---

## 14. Substitution eligibility

### Correction to v1.6

v1.6 ruled that `quad_isolation` must not reach `quad_squat`, on the grounds that substituting
a leg press "would roughly double quad volume." **That reasoning was wrong.** Set counts come
from PROGRAM and do not change on a swap: two sets of leg extension become two sets of leg
press. The volume claim was incorrect, and the taxonomy argument stacked on it does not stand
alone.

### Ruling

The v1.6 split was correct taxonomy and left `leg_extension` with one alternative. The
substitution neighbourhood and the taxonomy are not the same shape.

**Unilateral compounds are not acceptable substitutes for the leg extension.** Recorded as
decided.

The leg extension occupies that slot for its **cost profile**, not its muscle label: open
chain, seated, no stability demand, no hip involvement, negligible calf and Achilles loading,
and low systemic cost on a day that has already squatted and sits between two running days.
Bulgarian split squats, lunges and step-ups are closed-chain and stability-dependent, recruit
hip and glute, load the Achilles substantially — the step-up most — and at 8–15 per leg run
double the working reps. Same muscle, opposite cost profile.

**Leg press is an acceptable substitute.** Back supported, no spinal load, no stability demand,
no meaningful Achilles exposure. At the slot's 15–20 reps as a finisher it is the closest
available match to the leg extension's role, despite belonging to the squat taxonomy.

**Hack squat is not.** Greater systemic cost and some spinal loading — the wrong direction for
a finisher after squats.

Resulting neighbourhood for `leg_extension`: **`leg_press`, `sissy_squat`** (the latter
retaining its existing knee caution cue).

Mechanism is unspecified. The requirement is only that substitution eligibility be declarable
independently of slot membership, since `leg_press` belongs to the squat taxonomy and the
leg-extension neighbourhood at once.

### The stranded unilateral movements

The five `quad_unilateral` exercises remain unreachable by swap and are not stranded by error.
They serve deliberate single-leg work, which belongs in a PROGRAM rather than arriving through
a busy machine. Wednesday is already seven exercises, so introducing them is a designed trade
in a future block, not an addition to this one.

---

## 15. Decided, so they stop being re-derived

### Fractional plates are not part of the solution space

**Decided (v2.0), not deferred.** Fractional or magnetic add-on plates do not solve progression
stalls in this system.

They have now been proposed three times: by the spec author in the v1.6 amendment, and twice
since by outside readers of a session report. The athlete does not own them. v1.7's rack model
removed the need for them on the lateral raise, and §4 v2.0 removes what remained of the
motivation by letting a coarse increment through whenever the landing is still productive.

Any future proposal to solve a stall with fractional hardware should be answered with this
entry rather than re-argued.

### The session report is not URL-prefilled

**Decided (v2.0).** The report is handed off by `navigator.share()` with a clipboard write
first, never by a prefilled chat URL.

The handoff design note budgeted 1,800 characters and then compared a **plain** character count
against it. URL encoding inflates this text roughly 1.7×, chiefly because spaces triple: a real
Monday is 1,103 plain and **1,899 encoded**, and Friday is 2,167. The note's own over-budget
guard would therefore have fired every session, and the prefill branch could never have run.

Recorded so the idea is not revisited on the strength of the original estimate. The clipboard
write happens before the share attempt, so a cancelled or unsupported share leaves the report
recoverable rather than lost.
