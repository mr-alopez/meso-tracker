# Cue Policy

31 Aug 2026 · meso-tracker · normative for cue content

Settles what the cue field is for. No engine, schema or spec involvement — this governs
content and one layout decision. `load-progression-spec.md` is unaffected.

---

## 1. What a cue is

**A cue answers one question: how do I execute this movement well?**

It is durable technique. It is true in every block, in every week, for as long as the exercise
exists. It lives in the **library** (`exercises.json` and the inlined `LIBRARY`), not in
PROGRAM.

### The week 4 test

Read the cue as if it were week 4 of the block. If it reads oddly — because it says "New", or
addresses a decision already made, or describes a state that has passed — it is not a cue.
Apply this while writing, not afterwards.

### What a cue is not

| Not a cue | Why | Where it goes |
|---|---|---|
| **Load coaching** | §4–§8 do this job, responsively. A static line naming a number is wrong the week after it is written, and nothing on the card marks which voice is stale | Deleted. The engine owns load |
| **Block rationale** | Answers "why is this exercise here", which is asked once at block start and never between sets | The block design conversation and its notes |
| **App instructions** | Describes what the interface should already be doing | Deleted; fix the interface instead |
| **Anything time-bound** | Cannot update, and the card gives no signal that it has expired | Expressed as state — see §3 |

---

## 2. What was removed, and why it is worth remembering

The first block's cues carried four different jobs in one field. Removed on adoption:

**Load coaching** — shoulder press ("Hold 25 for all sets this time"), lat pulldown ("Week 1 is
for finding a weight…"), preacher curl ("You hit 17 reps at 40 — start at 45"). The shoulder
press cue sat directly above the engine saying `repeat 25 — need 15+ before 30`: two voices on
the same subject, agreeing by luck, only one of them responsive.

**Block rationale** — four cues opened with the word "New." and addressed a reader who existed
in week 1 only.

**App instructions** — the push-up's "Log reps only, leave the weight field empty" and the
squat's "don't log the ramp". Both documented behaviour the interface should enforce or
provide, and both are now obsolete: `loadSense: "none"` disables the weight field outright, and
warm-up rows give the ramp somewhere to live.

---

## 3. "New" is state, not text

The need behind "New." is real — an unfamiliar exercise deserves more attention than a known
one — but it belongs to the engine rather than the prose:

> **The cue is expanded by default when the exercise has no logged history in the current
> block, and collapsed otherwise.**

That is the `NO_DATA` state, already computed. It is correct at a block boundary with nobody
editing anything: an exercise carried into Meso 02 is not new and starts collapsed; a genuinely
new one expands until it has been logged. Neither requires a decision at authoring time.

---

## 4. Layout

Prescription and suggestion are one block. They are the same statement type — what to do today
— and had been sitting either side of something that is not.

```
repeat 85 — chase 12+          ← suggestion, primary: what changed and what to act on
3 × 8–12 · 2 RIR               ← prescription, secondary: stable context for the week
```

The suggestion leads because it is the part that moves. The cue sits below, subordinate and
collapsible per §3, because it answers a different question on a different clock.

---

## 5. For every future PROGRAM

**Write no cues in PROGRAM.** If a statement is durable technique it belongs in the library and
probably already exists there. If it is not durable, it is not a cue.

Block rationale still needs writing — it is how the design gets remembered — but it belongs in
the block's design notes, where it is read once and referred back to, rather than on a card
that gets scrolled past all month.
