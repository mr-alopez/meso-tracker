/* Acceptance-vector harness for the load progression engine.

   NOT part of the shipped app. index.html does not reference this file and
   sw.js does not precache it, so the installed app never downloads it.

   Run from the browser console on any page serving index.html:

     document.head.appendChild(Object.assign(document.createElement("script"),
       {src: "vectors.js", onload: () => runVectors()}));

   load-progression-spec.md §12 is the source of truth.

   BLOCK DEFAULTS (v2.2). Unless a row states otherwise it runs on a four-week
   block: deloadWeek 4, week RIR 3 / 2 / 1 / 4-5. Those used to come from a
   WEEK_RIR_TEXT constant inside the engine, which v2.2 removed because RIR is
   a property of a PROGRAM, not of the engine. Supplying them here rather than
   there is what keeps rows 1-52 passing unchanged: for a four-week block every
   generalised rule reduces to the form it already had, and that equivalence is
   this amendment's acceptance test.

   Rows 53-59 run on a five-week block, RIR 3 / 3 / 2 / 1 / 4-5.

   §4 v2.0 shipped 22 Sep 2026 and this file is no longer diverged: rows 1, 4
   and 33 carry their v2.0 expectations and rows 47-52 are present, for 52 in
   all. Each of the nine affected rows was derived by hand from §4's landing
   check before the engine was asked, so a pass means the engine agrees with the
   spec rather than with itself. This file transcribes
   that table; where they disagree, the table is correct and this file is
   wrong. Every row asserts class, outcome and exact text — including
   `class: null` on the short-circuit rows, which is what catches
   classification running on a path that should have short-circuited. */
(function () {
  // reps -> qualifying sets at one load; weight is unread for sense "none"
  const at = (w, reps) => reps.map(r => ({weight: w, reps: r}));
  const bw = reps => reps.map(r => ({weight: null, reps: r}));

  const R8_12 = {bottom: 8,  top: 12};
  const R10_15 = {bottom: 10, top: 15};
  const R12_20 = {bottom: 12, top: 20};
  const R15_20 = {bottom: 15, top: 20};
  const R10_12 = {bottom: 10, top: 12};
  const NO_RANGE = {bottom: 0, top: 0};   // sense "none" never reads the range
  const RACK = [10, 12, 15, 20, 25, 30];  // the gym's dumbbells: fives, except the 12

  // §1.1: a block's shape, supplied per row. RIR_4 mirrors Meso 01.
  const RIR_4 = {1: "3", 2: "2", 3: "1", 4: "4–5"};
  const RIR_5 = {1: "3", 2: "3", 3: "2", 4: "1", 5: "4–5"};
  const block = (len, rirs) => ({deloadWeek: len, rirs});
  const BLOCK_4 = block(4, RIR_4);
  const BLOCK_5 = block(5, RIR_5);

  const VECTORS = [
    { n: 1, expect: {class: "P_PASS", outcome: "ADD", text: "25 ✓ → try 30"},
      input: {weekSets: {1: at(25, [12, 11, 9])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 2, expect: {class: "P_PASS", outcome: "ADD", text: "85 ✓ → try 90"},
      input: {weekSets: {1: at(85, [12, 11, 10])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 3, expect: {class: "P_DROP", outcome: "HOLD", text: "repeat 85 — chase 12+"},
      input: {weekSets: {1: at(85, [12, 10, 7])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 4, expect: {class: "P_GATED", outcome: "HOLD_GATE", text: "repeat 10 — need 23+ before 15"},
      input: {weekSets: {1: at(10, [20, 18, 16])}, prescribed: 3, range: R12_20, step: 5,
              feedback: {effort: "easy"}, currentWeek: 2} },

    { n: 5, expect: {class: "P_PASS", outcome: "HOLD_RIR", text: "repeat 45 — same reps, more in reserve"},
      input: {weekSets: {1: at(45, [15, 14, 12])}, prescribed: 3, range: R10_15, step: 5,
              feedback: {effort: "brutal"}, currentWeek: 2} },

    { n: 6, expect: {class: "P_FAIL", outcome: "REDUCE", text: "drop to 50 — 10+ clean"},
      input: {weekSets: {1: at(60, [8, 7, 6])}, prescribed: 3, range: R10_15, step: 10,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 7, expect: {class: "P_PASS", outcome: "ADD", text: "70 ✓ → try 72.5"},
      input: {weekSets: {1: at(70, [15, 13, 12])}, prescribed: 3, range: R10_15, step: 2.5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 8, expect: {class: null, outcome: "MIXED", text: "pick one weight and hold it"},
      input: {weekSets: {1: [{weight: 65, reps: 12}, {weight: 95, reps: 7}, {weight: 85, reps: 10}]},
              prescribed: 3, range: R8_12, step: 5, feedback: {effort: "right"}, currentWeek: 2} },

    { n: 9, expect: {class: null, outcome: "PAIN", text: "pain flagged — go lighter or swap the movement"},
      input: {weekSets: {1: at(65, [12, 11, 10])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right", pain: true}, currentWeek: 2} },

    { n: 10, expect: {class: null, outcome: "DELOAD", text: "60 — 4–5 RIR, stop early"},
      input: {weekSets: {3: at(90, [10, 9, 8])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {}, currentWeek: 4} },

    { n: 11, expect: {class: null, outcome: "BW_PROGRESS", text: "beat 12 on the last set"},
      input: {weekSets: {1: bw([13, 12])}, prescribed: 2, range: NO_RANGE, step: 5,
              loadSense: "none", feedback: {}, currentWeek: 2} },

    { n: 12, expect: {class: null, outcome: "INCOMPLETE", text: "repeat 85 — 2 of 3 sets logged"},
      input: {weekSets: {1: at(85, [12, 11])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 13, expect: {class: null, outcome: "NO_DATA_BW", text: "2 shy of failure"},
      input: {weekSets: {}, prescribed: 2, range: NO_RANGE, step: 5,
              loadSense: "none", feedback: {}, currentWeek: 1} },

    { n: 14, expect: {class: null, outcome: "BW_PROGRESS", text: "beat 15 on the last set"},
      input: {weekSets: {1: bw([16, 15])}, prescribed: 2, range: NO_RANGE, step: 5,
              loadSense: "none", feedback: {}, currentWeek: 2} },

    { n: 15, expect: {class: null, outcome: "DELOAD_BW", text: "deload — stop 4–5 shy of failure"},
      input: {weekSets: {3: bw([18, 16])}, prescribed: 1, range: NO_RANGE, step: 5,
              loadSense: "none", feedback: {}, currentWeek: 4} },

    { n: 16, expect: {class: null, outcome: "PAIN_BW", text: "pain flagged — go easier or swap the movement"},
      input: {weekSets: {1: bw([14, 12])}, prescribed: 2, range: NO_RANGE, step: 5,
              loadSense: "none", feedback: {pain: true}, currentWeek: 2} },

    { n: 17, expect: {class: null, outcome: "INCOMPLETE_BW", text: "beat 12 — 1 of 2 sets logged"},
      input: {weekSets: {1: bw([12])}, prescribed: 2, range: NO_RANGE, step: 5,
              loadSense: "none", feedback: {}, currentWeek: 2} },

    { n: 18, expect: {class: "P_PASS", outcome: "ADD", text: "40 ✓ → drop assist to 30"},
      input: {weekSets: {1: at(40, [15, 13, 11])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 2} },

    { n: 19, expect: {class: "P_PASS", outcome: "ADD", text: "10 ✓ → try it unassisted"},
      input: {weekSets: {1: at(10, [15, 14, 12])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 2} },

    { n: 20, expect: {class: "P_PASS", outcome: "ADD", text: "unassisted — switch to Pull-Up"},
      input: {weekSets: {1: at(0, [15, 14, 12])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 2} },

    { n: 21, expect: {class: "P_FAIL", outcome: "REDUCE", text: "add assist to 40 — 10+ clean"},
      input: {weekSets: {1: at(30, [8, 7, 6])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 2} },

    { n: 22, expect: {class: null, outcome: "PAIN", text: "pain flagged — go lighter or swap the movement"},
      input: {weekSets: {1: [{weight: 65, reps: 12}, {weight: 95, reps: 7}, {weight: 85, reps: 10}]},
              prescribed: 3, range: R8_12, step: 5, loadSense: "weight",
              feedback: {pain: true}, currentWeek: 2} },

    { n: 23, expect: {class: null, outcome: "DELOAD", text: "55 — 4–5 RIR, stop early"},
      input: {weekSets: {2: at(85, [11, 10, 9])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {}, currentWeek: 4} },

    { n: 24, expect: {class: null, outcome: "DELOAD", text: "30 — 4–5 RIR, stop early"},
      input: {weekSets: {}, prescribed: 3, range: R10_15, step: 5, startLoad: 45,
              feedback: {}, currentWeek: 4} },

    { n: 25, expect: {class: null, outcome: "DELOAD",
                      text: "about two-thirds of your usual — 4–5 RIR, stop early"},
      input: {weekSets: {}, prescribed: 3, range: R10_15, step: 5, startLoad: null,
              feedback: {}, currentWeek: 4} },

    { n: 26, expect: {class: null, outcome: "DELOAD_ASSIST", text: "50 — 4–5 RIR, stop early"},
      input: {weekSets: {3: at(40, [14, 13, 11])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {}, currentWeek: 4} },

    { n: 27, expect: {class: null, outcome: "DELOAD_ASSIST", text: "60 — 4–5 RIR, stop early"},
      input: {weekSets: {2: at(50, [13, 12, 11])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {}, currentWeek: 4} },

    { n: 28, expect: {class: null, outcome: "DELOAD_ASSIST", text: "deload — more assistance, stop early"},
      input: {weekSets: {}, prescribed: 3, range: R10_15, step: 10, startLoad: null,
              loadSense: "assist", feedback: {}, currentWeek: 4} },

    // Guard, not a scenario: satisfies every double-step condition except
    // sense. Must be 390. A 380 means the §4 scoping is documentation only.
    { n: 29, expect: {class: "P_PASS", outcome: "ADD", text: "400 ✓ → drop assist to 390"},
      input: {weekSets: {1: at(400, [17, 15, 14])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 2} },

    // The reference week steps back past a week with nothing logged.
    { n: 30, expect: {class: "P_PASS", outcome: "ADD", text: "85 ✓ → try 90"},
      input: {weekSets: {1: at(85, [12, 11, 10]), 2: []}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 3} },

    // Nothing anywhere behind it: treated as new, exactly as a first week is.
    { n: 31, expect: {class: null, outcome: "NO_DATA", text: "find it — 12 reps, 1 in reserve"},
      input: {weekSets: {}, prescribed: 3, range: R8_12, step: 5, startLoad: null,
              feedback: {}, currentWeek: 3} },

    // A rack of real loads: the step depends on which dumbbell is in your hand.
    { n: 32, expect: {class: "P_PASS", outcome: "ADD", text: "10 ✓ → try 12"},
      input: {weekSets: {1: at(10, [20, 18, 16])}, prescribed: 3, range: R12_20, step: 5,
              rack: RACK, feedback: {effort: "easy"}, currentWeek: 2} },

    { n: 33, expect: {class: "P_PASS", outcome: "ADD", text: "12 ✓ → try 15"},
      input: {weekSets: {1: at(12, [20, 18, 16])}, prescribed: 3, range: R12_20, step: 5,
              rack: RACK, feedback: {effort: "right"}, currentWeek: 2} },

    { n: 34, expect: {class: "P_FAIL", outcome: "REDUCE", text: "drop to 12 — 12+ clean"},
      input: {weekSets: {1: at(15, [10, 9, 8])}, prescribed: 3, range: R12_20, step: 5,
              rack: RACK, feedback: {effort: "right"}, currentWeek: 2} },

    /* v1.8: a skip does not hide sets already logged. These pin behaviour that
       was previously emergent and is now a decided rule.

       `skipped` is deliberately NOT an engine input - the app expresses a skip
       by leaving no sets behind - so #36 and #37 are one input written twice.
       That is the point of the pair: they must stay byte-identical, and they
       fail loudly the moment anyone wires a skip flag into evaluation. */
    { n: 35, expect: {class: "P_PASS", outcome: "ADD", text: "85 ✓ → try 90"},
      input: {weekSets: {1: at(85, [12, 11, 10]), 2: []}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 3} },

    // week 2 skipped, but 2 of 3 sets were logged before he walked out
    { n: 36, expect: {class: null, outcome: "INCOMPLETE", text: "repeat 90 — 2 of 3 sets logged"},
      input: {weekSets: {1: at(85, [12, 11, 10]), 2: at(90, [9, 8])}, prescribed: 3,
              range: R8_12, step: 5, feedback: {effort: "right"}, currentWeek: 3} },

    // identical, without the skip: the skip must change nothing
    { n: 37, expect: {class: null, outcome: "INCOMPLETE", text: "repeat 90 — 2 of 3 sets logged"},
      input: {weekSets: {1: at(85, [12, 11, 10]), 2: at(90, [9, 8])}, prescribed: 3,
              range: R8_12, step: 5, feedback: {effort: "right"}, currentWeek: 3} },

    // a COMPLETE week under a skip must still progress normally
    { n: 38, expect: {class: "P_PASS", outcome: "ADD", text: "90 ✓ → try 95"},
      input: {weekSets: {1: at(85, [12, 11, 10]), 2: at(90, [12, 11, 10])}, prescribed: 3,
              range: R8_12, step: 5, feedback: {effort: "right"}, currentWeek: 3} },

    // first coverage of the assist INCOMPLETE string
    { n: 39, expect: {class: null, outcome: "INCOMPLETE", text: "repeat 40 assist — 2 of 3 sets logged"},
      input: {weekSets: {1: at(40, [14, 12])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 2} },

    /* v1.9 §13. Rows carrying `seed` run seedLoad(outgoing, programStart) first
       and feed the result in as startLoad, so what is asserted is where the
       seed came from. Pre-computing it would collapse 43, 44 and 45 into one
       row that proves nothing.

       `weekSets: {}` on every week-1 row is §13.3 itself: a new block holds no
       prior weeks, because the boundary is structural - weekSets can only be
       assembled from the bound block. */
    { n: 40, expect: {class: null, outcome: "NO_DATA", text: "start 90"},
      seed: {outgoing: {3: at(90, [10, 9, 8])}, programStart: null},
      input: {weekSets: {}, prescribed: 3, range: R8_12, step: 5,
              feedback: {}, currentWeek: 1} },

    // authoring beats inference: a named start is not overridden by a seed
    { n: 41, expect: {class: null, outcome: "NO_DATA", text: "start 100"},
      seed: {outgoing: {3: at(90, [10, 9, 8])}, programStart: 100},
      input: {weekSets: {}, prescribed: 3, range: R8_12, step: 5,
              feedback: {}, currentWeek: 1} },

    { n: 42, expect: {class: null, outcome: "NO_DATA", text: "find it — 15 reps, 3 in reserve"},
      seed: {outgoing: {}, programStart: null},
      input: {weekSets: {}, prescribed: 3, range: R10_15, step: 5,
              feedback: {}, currentWeek: 1} },

    // deload exclusion: week 4 is the only logged week, §13.2 refuses it
    { n: 43, expect: {class: null, outcome: "NO_DATA", text: "find it — 15 reps, 3 in reserve"},
      seed: {outgoing: {4: at(60, [12, 11, 10])}, programStart: null},
      input: {weekSets: {}, prescribed: 3, range: R10_15, step: 5,
              feedback: {}, currentWeek: 1} },

    { n: 44, expect: {class: null, outcome: "NO_DATA", text: "start 90"},
      seed: {outgoing: {1: at(80, [12, 11, 10]), 2: at(85, [12, 11, 10]), 3: at(90, [12, 11, 10])},
             programStart: null},
      input: {weekSets: {}, prescribed: 3, range: R8_12, step: 5,
              feedback: {}, currentWeek: 1} },

    // walks back past an empty week 3, and still refuses week 4
    { n: 45, expect: {class: null, outcome: "NO_DATA", text: "start 85"},
      seed: {outgoing: {2: at(85, [12, 11, 10]), 3: [], 4: at(60, [12, 11, 10])}, programStart: null},
      input: {weekSets: {}, prescribed: 3, range: R8_12, step: 5,
              feedback: {}, currentWeek: 1} },

    /* Guard on §13.3. The boundary stops a reference week leaving a block, NOT
       weeks referencing each other inside one. An implementation that
       over-applies it returns NO_DATA here instead of progressing. */
    { n: 46, expect: {class: "P_PASS", outcome: "ADD", text: "90 ✓ → try 95"},
      input: {weekSets: {1: at(90, [12, 11, 10])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    /* 47-50 are the survey cases and the point of §4 v2.0: a perfect week under
       the prescription must progress. All four were held by the v1.9 gate. */
    { n: 47, expect: {class: "P_PASS", outcome: "ADD", text: "25 ✓ → try 30"},
      input: {weekSets: {1: at(25, [12, 11, 10])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 48, expect: {class: "P_PASS", outcome: "ADD", text: "20 ✓ → try 25"},
      input: {weekSets: {1: at(20, [15, 13, 12])}, prescribed: 3, range: R10_15, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 49, expect: {class: "P_PASS", outcome: "ADD", text: "45 ✓ → try 55"},
      input: {weekSets: {1: at(45, [20, 18, 16])}, prescribed: 3, range: R15_20, step: 10,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 50, expect: {class: "P_PASS", outcome: "ADD", text: "65 ✓ → try 70"},
      input: {weekSets: {1: at(65, [12, 11, 10])}, prescribed: 3, range: R10_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    /* 51 and 52 hold the floor: the gate still refuses a jump that lands set 1
       below half the range bottom, and still separates "not yet" from "never".
       51 is row 4 at effort `right`, which must not change the result - the
       gate is effort-independent across easy and right. */
    { n: 51, expect: {class: "P_GATED", outcome: "HOLD_GATE", text: "repeat 10 — need 23+ before 15"},
      input: {weekSets: {1: at(10, [20, 18, 16])}, prescribed: 3, range: R12_20, step: 5,
              feedback: {effort: "right"}, currentWeek: 2} },

    { n: 52, expect: {class: "P_UNPROGRESSABLE", outcome: "HOLD",
                     text: "10 is too big a jump here — hold 10 and add reps"},
      input: {weekSets: {1: at(10, [20, 18, 16])}, prescribed: 3, range: R12_20, step: 10,
              feedback: {effort: "right"}, currentWeek: 2} },

    /* 53-59 are v2.2: a FIVE-week block, where week 4 is a loading week and
       week 5 is the deload. 53 is the guard the whole amendment is checked
       against - any surviving `week === 4` test returns DELOAD here instead of
       ADD, which is the one failure mode a week-literal replacement has. */
    { n: 53, block: BLOCK_5, expect: {class: "P_PASS", outcome: "ADD", text: "85 ✓ → try 90"},
      input: {weekSets: {3: at(85, [12, 11, 10])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 4} },

    { n: 54, block: BLOCK_5, expect: {class: null, outcome: "DELOAD", text: "60 — 4–5 RIR, stop early"},
      input: {weekSets: {4: at(90, [10, 9, 8])}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 5} },

    // 55: week 4 holds nothing, so the cascade steps back to week 3.
    { n: 55, block: BLOCK_5, expect: {class: null, outcome: "DELOAD", text: "55 — 4–5 RIR, stop early"},
      input: {weekSets: {3: at(85, [12, 11, 10]), 4: []}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 5} },

    { n: 56, block: BLOCK_5, expect: {class: null, outcome: "DELOAD_ASSIST", text: "50 — 4–5 RIR, stop early"},
      input: {weekSets: {4: at(40, [12, 11, 10])}, prescribed: 3, range: R10_15, step: 10,
              loadSense: "assist", feedback: {effort: "right"}, currentWeek: 5} },

    { n: 57, block: BLOCK_5, expect: {class: null, outcome: "DELOAD_BW", text: "deload — stop 4–5 shy of failure"},
      input: {weekSets: {4: bw([25, 24, 22])}, prescribed: 2, range: {bottom: 0, top: 0}, step: 5,
              loadSense: "none", feedback: {effort: "right"}, currentWeek: 5} },

    /* 58 and 59 seed from a FIVE-week outgoing block. 58 walks its weeks 4..1
       and finds 90 in week 4, a loading week there. 59 confirms week 5 is that
       block's deload and is excluded, leaving nothing to seed. */
    { n: 58, block: BLOCK_5,
      seed: {block: BLOCK_5, outgoing: {1: at(80, [12]), 2: at(85, [12]), 3: at(85, [12]), 4: at(90, [12])},
             programStart: null},
      expect: {class: null, outcome: "NO_DATA", text: "start 90"},
      input: {weekSets: {}, prescribed: 3, range: R8_12, step: 5,
              feedback: {effort: "right"}, currentWeek: 1} },

    { n: 59, block: BLOCK_5,
      seed: {block: BLOCK_5, outgoing: {5: at(60, [12])}, programStart: null},
      expect: {class: null, outcome: "NO_DATA", text: "find it — 15 reps, 3 in reserve"},
      input: {weekSets: {}, prescribed: 3, range: R10_15, step: 5,
              feedback: {effort: "right"}, currentWeek: 1} }
  ];

  window.VECTORS = VECTORS;

  window.runVectors = function runVectors() {
    const q = v => JSON.stringify(v);
    const results = VECTORS.map(v => {
      let got;
      try {
        // §13.2 rows resolve their own startLoad through the seeding rule.
        const blk = v.block || BLOCK_4;
        /* §1.1: seeding walks the OUTGOING block's loading weeks on ITS length,
           which is not necessarily this row's. A row carrying a seed says which. */
        const base = v.seed
          ? Object.assign({}, v.input,
              {startLoad: seedLoad(v.seed.outgoing, v.seed.programStart,
                                   (v.seed.block || BLOCK_4).deloadWeek - 1)})
          : v.input;
        const input = Object.assign({deloadWeek: blk.deloadWeek,
                                     rir: blk.rirs[base.currentWeek]}, base);
        got = suggestLoad(input);
      }
      catch (e) { return {n: v.n, ok: false, detail: `threw ${e.message}`}; }
      const bad = [];
      if (got.class !== v.expect.class)     bad.push(`class ${q(got.class)} ≠ ${q(v.expect.class)}`);
      if (got.outcome !== v.expect.outcome) bad.push(`outcome ${q(got.outcome)} ≠ ${q(v.expect.outcome)}`);
      if (got.text !== v.expect.text)       bad.push(`text ${q(got.text)} ≠ ${q(v.expect.text)}`);
      return {n: v.n, ok: bad.length === 0, detail: bad.join("; "), got};
    });

    results.forEach(r => console.log(
      `${r.ok ? "PASS" : "FAIL"} #${String(r.n).padStart(2)}${r.ok ? "" : "  " + r.detail}`));

    /* §13.7, outside the vector table: validation is not suggestLoad. Every
       shipped PROGRAM must be valid, and a deliberately broken one must report
       exactly the error §13.7 specifies. */
    const progChecks = [];
    if (typeof validateProgram === "function" && typeof PROGRAMS === "object") {
      Object.entries(PROGRAMS).forEach(([id, prog]) => {
        const errs = validateProgram(prog, id);
        progChecks.push({name: `PROGRAMS.${id} valid`, ok: errs.length === 0, detail: errs.join(" | ")});
      });
      const broken = {weeks: [{n:1},{n:2},{n:3},{n:4},{n:5}],
                      days: [{key: "mon", ex: [{id: "inc_db_press", sets: [3, 3, 3, 2]}]}]};
      const errs = validateProgram(broken, "scratch5");
      const want = "scratch5 mon inc_db_press: 4 set counts for a 5-week block";
      progChecks.push({name: "short set array reports §13.7 text",
                       ok: errs.length === 1 && errs[0] === want,
                       detail: `got ${JSON.stringify(errs)}`});
    }
    progChecks.forEach(c => console.log(`${c.ok ? "PASS" : "FAIL"} §13.7 ${c.name}${c.ok ? "" : "  " + c.detail}`));
    const progFailed = progChecks.filter(c => !c.ok);

    const failed = results.filter(r => !r.ok).map(r => r.n);
    const nulls = VECTORS.filter(v => v.expect.class === null).length;
    console.log(`${results.length - failed.length}/${results.length} passed · ` +
                `${nulls} rows assert class: null · ` +
                `§13.7 ${progChecks.length - progFailed.length}/${progChecks.length}`);
    return {total: results.length, passed: results.length - failed.length, failed, results,
            programChecks: progChecks, programFailed: progFailed.map(c => c.name)};
  };
})();
