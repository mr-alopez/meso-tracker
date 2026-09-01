# Mesocycle Builder — Design Specification

1 Sep 2026 · meso-tracker · **draft, nothing here is built**

Amendment A folded in (1 Sep 2026): sequencing, library preconditions, the clinical claim
removed, the session-length check suppressed until calibrated, and the export question decided.

A separate desk-oriented page that proposes a mesocycle PROGRAM and lets it be edited before it
becomes a block. Feeds §13's block creation.

> **Current priority is phase 0, which needs none of this.** Meso 02 ships on the existing
> `PROGRAMS` mechanism. See §10.

---

## 1. Scope

**Generates:** week structure, day assignment, per-muscle volume distribution, exercise
selection, per-week set counts.

**Never generates:** rep ranges (slots own those), RIR targets (fixed 3/2/1/deload), starting
loads (§13.2 seeding owns those), the exercise library.

**Non-goal:** being right. The generator proposes a starting point from stated rules. Its output
is a draft, editable in full, and the volume tally is the thing that actually protects the
design.

---

## 2. Architecture precondition

**PROGRAM must move from code to data before the builder can write one.**

Today `PROGRAMS.meso01` is a `const` in `index.html`, and `mesos.{id}.program` holds a string
key resolved through `PROGRAMS[blk.program]`. The indirection the builder needs already exists
and is already tested; the change is replacing the key with the object.

Required:

- PROGRAM moves into the storage envelope, per block: `mesos.{id}.program`
- A migration imports the current hardcoded PROGRAM into `meso01` unchanged
- The builder writes a new `program` and then §13.1 runs as already specified
- The builder **must export the PROGRAM as JSON before a block can be activated** — see below

### Decided: export is mandatory, not optional

PROGRAM currently lives in git and has properties localStorage does not: versioned, diffable,
recoverable from a cleared browser, safe without anyone remembering anything. Moving it into the
envelope places the one artefact that has never depended on habit alongside the ones that do.

**The builder cannot activate a block until its PROGRAM JSON has been downloaded.** A required
step in the confirm flow, not a button offered afterwards. Block creation happens roughly four
times a year — a cadence at which mandatory friction costs almost nothing and removes a failure
mode entirely.

**Not adopted:** the app reading PROGRAM seed files from the repo. That would restore the repo
as source of truth but reintroduces a fetch under `file://` and a second place for PROGRAMs to
diverge. The mandatory export achieves the recovery property without it.

**[revisit]** If PROGRAMs ever need sharing or reuse across devices, importing a PROGRAM JSON —
separate from the full-envelope import — is the natural next step.

---

## 2A. Library preconditions

Schema work rather than generation logic. Both belong in phase 1.

### Calves

The library knows eight muscles: Back, Biceps, Chest, Hamstrings, Quads, Rear delt, Shoulders,
Triceps. §4 assigns emphasis to nine.

Add the muscle, at least one slot, and exercises to fill it — a standing and a seated heel raise
at minimum.

### `achillesLoad` — sparse, not dense

`spinalLoad` is populated across all 60 entries. Annotating 60 to constrain roughly five would
be the wrong shape, and the library already has the better pattern: `loadSense` is omitted from
most entries and defaults on read, and `step` appears only where it overrides. Dense
`spinalLoad` is the outlier, not the model.

```
achillesLoad: "high"   — present only where it applies
absent                 — no meaningful Achilles loading
```

Applied to `db_step_up`, `walking_lunge`, `db_reverse_lunge`, and any calf raise added. Five or
six entries, in both `exercises.json` and the inlined `LIBRARY`.

§6.2's constraint reads: at most one `achillesLoad: "high"` exercise per day.

---

## 3. Where it lives

`builder.html`, same repo, same origin. Same origin means it reads and writes the same
localStorage envelope with no sync mechanism.

- Not precached by the service worker. It is a desk activity with connectivity.
- Wider layout, denser controls, no one-handed constraint.
- The logging app links to it; it links back. They do not share a UI framework because neither
  has one.

---

## 4. Inputs

Asked once, at the top of the page. Everything has a default so an impatient user can generate
immediately.

| Input | Default | Notes |
|---|---|---|
| Block length | 4 weeks (3 loading + deload) | Deload is always the final week |
| Lifting days | Mon / Wed / Fri | Days not selected are assumed to be running or rest |
| Minutes per session | 60 | Drives the feasibility check in §7 |
| Per-muscle emphasis | carried from prior block | See §5 |

**Emphasis** is set per muscle: `Lead`, `Develop`, `Maintain`, `Off`.

Muscles: Chest, Back, Shoulders, Rear delt, Biceps, Triceps, Quads, Hamstrings, Calves.

Calves are absent from the library entirely, which appears to be an artefact of how the first
block was assembled rather than a decision. Add the muscle and exercises; what loading is
appropriate given an Achilles history is a question for his physio, not for this document.

---

## 5. Volume model

Weekly **direct** set targets per muscle, by emphasis:

| Emphasis | Sets/week | Meaning |
|---|---|---|
| `Lead` | 16–20 | The block's priority. At most two muscles |
| `Develop` | 12–15 | Actively growing |
| `Maintain` | 8–10 | Holding ground |
| `Off` | 0 | No direct work. Still receives indirect volume |

**These are population estimates with wide individual variation, not measurements.** The builder
must display them as ranges with that caveat visible, not as targets to hit. Roughly 10 weekly
sets is where growth becomes reliable for most people, 20 is where returns flatten for many, and
both boundaries move a lot between individuals.

**At most two muscles may be `Lead`.** If more are selected, the builder refuses and says why.

**[revisit]** Once a block completes, the end-of-block volume report should propose emphasis
defaults from actual feedback rather than from these numbers.

---

## 6. Generation, in order

### 6.1 Frequency

Each muscle with ≥ 10 weekly sets is split across **two days**. Below 10, one day.

### 6.2 Day assignment

Assign muscles to days minimising the spread of total sets per day, subject to:

- A muscle's two exposures are not on consecutive lifting days where avoidable
- Antagonists may share a day; a `Lead` muscle is placed first on its day
- **At most one `spinalLoad: "high"` exercise per day**
- **At most one `achillesLoad: "high"` exercise per day**, and never on a day where a high
  spinal-load exercise is already placed

Every lifting day precedes a running day in the default Mon/Wed/Fri schedule. That is a fixed
constraint, not something the builder can optimise around — it should be stated on screen rather
than silently ignored.

### 6.3 Exercise selection

For each muscle, fill its set budget:

1. Take slots in the muscle's canonical order, compound before isolation
2. Within a slot, prefer an exercise with logged history in a prior block — a known working load
   is worth more than novelty
3. Where emphasis is `Lead`, allow one slot to take a new exercise
4. Never place the same exercise twice in one day
5. Respect equipment availability and the per-day spinal and Achilles limits above
6. Base sets per exercise: 3 for compounds, 2 for isolation, adjusted to meet the muscle's
   weekly budget

### 6.4 Set progression across weeks

| Emphasis | Weeks 1–4 |
|---|---|
| `Lead` | `[b, b, b+1, ceil(b/2)]` |
| All others | `[b, b, b, ceil(b/2)]` |

Where `b` is the base set count from §6.3. This reproduces the pattern in the current PROGRAM,
which was written by hand.

**[revisit]** A single added set in week 3 for lead muscles only is a conservative progression.
Real volume progression driven by feedback remains unspecified and unbuilt.

---

## 7. Guardrails

Shown live, updating as the draft is edited. **None of them block; all of them warn.**

| Check | Warning |
|---|---|
| Muscle below 8 weekly sets and not `Off` | `{muscle} at {n} sets — below where growth is reliable` |
| Muscle above 22 weekly sets | `{muscle} at {n} sets — past where most people see returns` |
| More than two `Lead` muscles | Refused at input, per §5 |
| Estimated session length over the stated minutes | see below |
| A day carries two `spinalLoad: "high"` exercises | `{day} has two heavy spinal loads` |
| Total weekly sets above 70 | `{n} sets a week across three sessions and three runs` |

### Session length is uncalibrated and must say so

The original estimate — 8 minutes plus 2.5 per working set — predicts 53 minutes for the one
session ever measured. He took 43.3. Roughly 22% over, which would fire the warning on a plan
comfortably inside budget. **A guardrail that warns on a good plan trains the user to dismiss
it, and is then not a guardrail.**

- **Store session duration per `(week, day)`.** Elapsed time currently lives only in
  `timers.sessionAccum`, global UI state cleared on a new day, so the app cannot learn his pace
  as built. Additive schema change, phase 1, same migration as PROGRAM-to-data.
- **Suppress the warning until calibrated.** Show the estimate always; show the *warning* only
  once at least four stored durations exist for that day pattern. Below that, display the
  estimate with a note that it is not yet based on his sessions.
- **Derive the constant from stored durations**, rather than retuning it now. One measurement is
  not a calibration.

### Decided: what the clock measures

**The session clock measures time at the gym.** He starts it on arrival, before warming up, and
it runs until he leaves. Confirmed for the one historical session too — the clock was already
running through those warm-ups.

Two consequences:

- **No separate warm-up term.** Warm-up time is already inside every stored duration, so
  `+8 min` on top double-counts it. The model is a single all-in per-set rate.
- The one measurement reads **43.3 min ÷ 18 working sets ≈ 2.4 min/set, all-in.** Recorded as
  an observation, not a calibration — the constant still comes from stored durations per §7.

### Decided: End is the only thing that ends a session

Auto-pause on the last working set is **removed**. It stopped the clock where training stops,
not where he leaves, so under a door-to-door definition every duration would have been short by
the cool-down and walk-out — and short by a different amount each time, which is worse than
being consistently short.

The last set still ends the *rest* interval, since there is nothing left to rest for.

**End and the report are now separate buttons.** They were one control doing two unrelated jobs:
the report reads logged sets, not the clock, so it works during a session, after it, or days
later, while End is only offered while a session is running. The report button appears whenever
the day in view has logged work.

**A forgotten clock is discarded at two hours.** Removing auto-pause left nothing to stop a
session he walked away from. Two hours is his own bound — he is never at the gym longer and
calls two a stretch.

It **discards rather than caps**. A clock still running at two hours means End was never
pressed, so the duration is unknown, not two hours. Capping would write a plausible-looking
number wrong by however long he had already left, and that number would then feed the pace
calibration this section wants to derive from real sessions. An absent duration is honestly
absent.

The guard fires only on a **running** clock. A paused one over two hours is a session he ended
and is left alone, so a genuinely long session that was marked properly still counts.

**The weekly-sets-by-muscle table is always visible while editing.** Not behind a disclosure,
not on another tab. It is the single most valuable thing on the page: the first conversation
about this program was resolved by that table showing 17 biceps sets against 2 for chest.

---

## 8. Output

The draft is a PROGRAM object. Editing is available at every level: add or remove exercises,
change set counts per week, reorder, rename the block, override any generated value.

On confirm:

1. **Download the PROGRAM JSON** — required, per §2
2. Write `mesos.{newId}.program`
3. Run §13.1 block creation — seeding, carry-over, activation — unchanged

Nothing about §13 changes. The builder produces the PROGRAM that §13.1 already requires to
exist.

---

## 9. What it never does

- Write to a prior block
- Generate rep ranges, RIR targets or starting loads
- Present its volume numbers as anything other than population estimates
- Prevent the athlete from overruling any proposal

---

## 10. Build order

**Meso 02 ships on the existing `PROGRAMS` mechanism. The builder targets Meso 03.**

The original order put PROGRAM-to-data first as the risk-bearing step. That was written on a
wrong premise: the indirection already exists and is already tested, and moving it touches
`bindBlock`, `createBlock` and `freshBlock` — the three functions constituting the finished §13
work. Re-verifying deadline-bearing code to enable a feature not needed yet is a bad trade.

| Phase | Work | When |
|---|---|---|
| 0 | Meso 02 PROGRAM authored by hand into `PROGRAMS`; create/switch UI | Before mid-September |
| 1 | PROGRAM to data, with migration. Per-day session duration in the same migration. Library preconditions per §2A | Early in Meso 02 |
| 2 | `builder.html` renders an existing PROGRAM editable, with the live volume tally | Mid Meso 02 |
| 3 | Generation per §6 | Late Meso 02 |
| 4 | Guardrails per §7, export per §8 | Before Meso 03 |

Phase 1 lands during a block rather than against the end of one. Phase 2 is independently
useful: an editable PROGRAM with a live tally is enough to build a block by hand.
