# Load Progression Spec — meso-tracker

Version 1.1 · 22 Aug 2026 — §4 revised: jump feasibility gate supersedes the flat 10% threshold; `P_UNPROGRESSABLE` added to §8

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
| `step` | Smallest load increment available (see §2) |
| `jumpPct` | `step / workingLoad` |
| `feedback.effort` | `"easy"` / `"right"` / `"brutal"`. Absent → treat as `"right"` |
| `feedback.pain` | Boolean joint-pain flag. Absent → false |

A suggestion for week *N* is computed from week *N−1* data for the same
`(day, exerciseId)`. Suggestions are never computed from a different exerciseId.

Storage: `feedback|{week}|{day}|{exerciseId}` → `{effort, pain}`.

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

**Per-exercise override:** an exercise may carry an optional `step` field which wins
over the table. Machine flye is known to have fine add-ons (72.5 lb appears in the
logs), so it should carry `step: 2.5`.

**Double-step clause:** if `jumpPct < 3%` AND performance is `P_PASS` AND
`first.reps >= range.top + 2`, suggest **two** steps instead of one. This only fires
at loads heavy enough that a single step is trivial. At current loads it will
essentially never fire; it exists so the rule doesn't stall in a year.

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

## 4. Jump feasibility gate

Applied only when the class is `P_PASS`.

```
estimatedRepLoss = ceil(jumpPct / 0.03)
requiredReps     = range.bottom + estimatedRepLoss
ceiling          = range.top + 6

if requiredReps > ceiling:        class = P_UNPROGRESSABLE
elif first.reps < requiredReps:   class = P_GATED
```

The condition asks whether enough reps are in hand that, after the expected
loss from the added load, set 1 still lands at or above the bottom of the
range. Roughly 3% added load costs one rep; this is a heuristic, and it
understates the loss at high rep counts, which errs conservative. **[revisit]**

`P_UNPROGRESSABLE` means the smallest available increment cannot be absorbed
by this rep range at this load — the lift is not progressable by load until
smaller increments exist or the load grows. It is a hold, not an error.

Text:

| Class | Suggestion text |
|---|---|
| `P_GATED` | `repeat {load} — need {requiredReps}+ before {load+step}` |
| `P_UNPROGRESSABLE` | `{step} is too big a jump here — hold {load} and add reps` |

In §8, `P_UNPROGRESSABLE` × any effort → hold, using the text above.

---

## 5. Evaluation order

Check in this order. First match wins; later rules do not run.

1. **Current week is 4 (deload)** → `DELOAD` (§7)
2. **No qualifying sets in the prior week** → `NO_DATA`
3. **`feedback.pain` was set last week** → `PAIN`
4. **Exercise is bodyweight** → §6
5. **`mixedLoad`** → `MIXED`
6. **`n < prescribed`** → `INCOMPLETE`
7. Otherwise → performance × feedback matrix (§8)

---

## 6. Bodyweight exercises

Never suggest a load. `weight` is ignored entirely.

| Condition | Output |
|---|---|
| Prior week has qualifying sets | `beat {last.reps} on the last set` |
| No prior data | `2 shy of failure` |

**[revisit]** When last-set reps exceed 25, added load or a harder variant is the
right progression. Not specified — the app says nothing and you decide.

---

## 7. Deload behaviour (week 4)

- **No progression suggestion is ever produced during week 4**, regardless of feedback
  or performance.
- **Week 3 → 4 load:** `week3.workingLoad × 0.70`, rounded **down** to the nearest
  `step`. This lands inside the intended 65–70% band and errs low.
- **Week 4 feedback is recorded but not acted on.** It exists for your reading, not
  the algorithm's.
- **Next mesocycle inheritance:** week 1 of a new meso inherits **week 3's**
  `workingLoad` — not week 4's — with **no increment applied**. You start the new block
  at the last real loading weight. **[revisit]** Whether a fresh meso should open one
  step higher is a real question; conservative default is no.

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
| `PAIN` | Prior week pain flag | `hold {load} — or swap the movement` |
| `MIXED` | Loads differ within the exercise | `pick one weight and hold it` |
| `INCOMPLETE` | Fewer qualifying sets than prescribed | `repeat {load} — finish all {prescribed} sets` |

`PAIN` never increases load under any performance class. It is an unconditional
override sitting above the matrix.

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
