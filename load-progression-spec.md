# Load Progression Spec — meso-tracker

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
| `step` | Smallest load increment available (see §2) |
| `jumpPct` | `step / workingLoad` |
| `feedback.effort` | `"easy"` / `"right"` / `"brutal"`. Absent → treat as `"right"` |
| `feedback.pain` | Boolean joint-pain flag. Absent → false |
| `loadSense` | `"weight"` (default), `"none"`, or `"assist"`. Library field. Absent → `"weight"` |

A suggestion for week *N* is computed from week *N−1* data for the same
`(day, exerciseId)`. Suggestions are never computed from a different exerciseId.

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

**[revisit]** Dips and pull-ups can be weighted with a belt. Treated as `none` for now;
adding load to them would require a fourth sense or a per-set flag.

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
| 1 | Current week is 4 | `DELOAD_BW` | `deload — stop 4–5 shy of failure` |
| 2 | `feedback.pain` set last week | `PAIN_BW` | `pain flagged — go easier or swap the movement` |
| 3 | No qualifying sets in prior week | `NO_DATA_BW` | `2 shy of failure` |
| 4 | `n < prescribed` | `INCOMPLETE_BW` | `beat {last.reps} — finish all {prescribed} sets` |
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
| 1 | Current week is 4 | `DELOAD_ASSIST` | see §7.1 |
| 2 | `feedback.pain` set last week | `PAIN_ASSIST` | `pain flagged — more assistance or swap the movement` |
| 3 | No qualifying sets in prior week | `NO_DATA` | `find it — {top} reps, {rir} in reserve` |
| 4 | `mixedLoad` | `MIXED` | `pick one assist level and hold it` |
| 5 | `n < prescribed` | `INCOMPLETE` | `repeat {load} assist — finish all {prescribed} sets` |
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
| 1 | Current week is 4 | `DELOAD` (§7) |
| 2 | No qualifying sets in prior week | `NO_DATA` |
| 3 | `feedback.pain` set last week | `PAIN` |
| 4 | `mixedLoad` | `MIXED` |
| 5 | `n < prescribed` | `INCOMPLETE` |
| 6 | Otherwise | §3 classification → §4 gate → §8 matrix |

---

## 7. Deload behaviour (week 4)

- **No progression suggestion is ever produced during week 4**, regardless of feedback
  or performance.
- **Week 4 feedback is recorded but not acted on.** It exists for your reading, not
  the algorithm's.
- **Next mesocycle inheritance:** week 1 of a new meso inherits **week 3's**
  `workingLoad` — not week 4's — with **no increment applied**. You start the new block
  at the last real loading weight. **[revisit]** Whether a fresh meso should open one
  step higher is a real question; conservative default is no.

**Deload load, sense `weight`.** Resolves the case where week 3 has no computable
working load:

```
deloadBase =
  1. week 3 workingLoad, if computable
  2. else the most recent prior week (2, then 1) with a computable workingLoad
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

Sense `assist` takes its own week-4 row (§6.2 row 1); sense `none` takes §6.1 row 1.

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
| `INCOMPLETE` | Fewer qualifying sets than prescribed | `repeat {load} — finish all {prescribed} sets` |

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
| 1 | DB 25, 8–12, 12/11/9 | `P_GATED` | `HOLD_GATE` | `repeat 25 — need 15+ before 30` |
| 2 | BB 85, 8–12, 12/11/10 | `P_PASS` | `ADD` | `85 ✓ → try 90` |
| 3 | BB 85, 8–12, 12/10/7 | `P_DROP` | `HOLD` | `repeat 85 — chase 12+` |
| 4 | DB 10, 12–20, 20/18/16, easy | `P_UNPROGRESSABLE` | `HOLD` | `5 is too big a jump here — hold 10 and add reps` |
| 5 | BB 45, 10–15, 15/14/12, brutal | `P_PASS` | `HOLD_RIR` | `repeat 45 — same reps, more in reserve` |
| 6 | Cable 60, 10–15, 8/7/6 | `P_FAIL` | `REDUCE` | `drop to 50 — 10+ clean` |
| 7 | Machine 70 step 2.5, 10–15, 15/13/12 | `P_PASS` | `ADD` | `70 ✓ → try 72.5` |
| 8 | BB 65×12 / 95×7 / 85×10 | — | `MIXED` | `pick one weight and hold it` |
| 9 | BB 65, range 8–12, sets 12/11/10, presc 3, pain = true | — | `PAIN` | `pain flagged — go lighter or swap the movement` |
| 10 | Week 4, week-3 load 90, step 5 | — | `DELOAD` | `60 — 4–5 RIR, stop early` |
| 11 | `pushup`, prior last set 12, presc 2, 2 sets logged | — | `BW_PROGRESS` | `beat 12 on the last set` |
| 12 | BB 85, 8–12, 12/11 (2 of 3 logged) | — | `INCOMPLETE` | `repeat 85 — finish all 3 sets` |
| 13 | `pushup`, week 1, no prior data | — | `NO_DATA_BW` | `2 shy of failure` |
| 14 | `pushup`, week 2, prior last set 15, presc 2, logged 2 | — | `BW_PROGRESS` | `beat 15 on the last set` |
| 15 | `pushup`, week 4 | — | `DELOAD_BW` | `deload — stop 4–5 shy of failure` |
| 16 | `pushup`, prior week pain = true | — | `PAIN_BW` | `pain flagged — go easier or swap the movement` |
| 17 | `pushup`, presc 2, 1 set logged, last 12 | — | `INCOMPLETE_BW` | `beat 12 — finish all 2 sets` |
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

Vectors 1–12 originate with v1.0/v1.1. **Vector 9's text was amended by v1.2 §9**, which
removed the load number from `PAIN`. **Vector 11 was amended by v1.3**, which supplied the
`prescribed` value it omitted — without one, §6.1 rows 4 and 5 are indistinguishable — and
the `BW_PROGRESS` outcome name. Vectors 1–8, 10 and 12 are unchanged: all are sense
`weight` on paths v1.2 and v1.3 do not touch, and vector 10's deload resolves at rung 1 of
§7's cascade, never reaching a later rung or §7.1. **v1.4 split every row's `Expected` cell**
across the class and outcome columns — vectors 1, 3, 4 and 5 had stated a class where the
other rows stated an outcome — and changed no expectation.

Vectors 9 and 22 assert the same text from different inputs — 9 from clean loads, 22 from
mixed. Both are retained: together they demonstrate that `PAIN` overrides regardless of
load shape. The dropped number is not an information loss, since the prior week's loads
remain visible in the per-set ghost text.

Vector 28 is the realistic path: the assisted pull-up is swapped into the vertical-pull
slot during week 3 or 4, so no week under that exercise id carries a working load.

Vector 29 is a guard, not a scenario. It satisfies every condition of the double-step
clause except sense — `jumpPct` = 2.5%, `P_PASS`, set 1 at `top + 2` — and must still
suggest a single step. If it returns 380, the §4 scoping was not applied.

Vector 18 demonstrates the gate exclusion: under sense `weight`, `10/40` = 25% would
have triggered `P_GATED`. With the gate skipped for `assist`, it progresses.

Vector 22 must return `PAIN` even though the mixed loads would otherwise route to
`MIXED` — pain sits above mixed-load in the §6.3 order.

Vectors 23 and 24 exercise the fallback cascade: 85 × 0.70 = 59.5, floored to 55;
45 × 0.70 = 31.5, floored to 30.
