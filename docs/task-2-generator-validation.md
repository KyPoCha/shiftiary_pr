# Task 2: Generator Validation Plan

## Goal

Add a new penalty for three consecutive night shifts and prove two things:

1. The new generator result is better with respect to three-night blocks.
2. Existing behavior did not materially regress.

The generator is stochastic, so one run is not evidence. We compare distributions across repeated runs.

## Prototype Implementation

The app now includes a local simulation engine in `features/generator-evaluation/engine`.

It implements:

- a pasted JSON input flow for database or SQL-exported scheduling snapshots
- contextual help topics for dataset input, benchmarks, algorithms, comparisons, penalty breakdowns, validation gates, and engine notes
- Zod validation before any optimizer run is allowed
- normalization from exported account data into a stable scheduling snapshot
- generated benchmark inputs with staff, availability, preferences, day coverage, and night coverage
- seeded pseudo-random runs
- three scheduler algorithms with different tradeoffs:
  - greedy construction
  - greedy construction plus local repair
  - simulated annealing-style local search
- a current rule variant that ignores the three-night penalty
- a candidate rule variant that includes the three-night penalty
- common scoring so both variants are compared with the same release criteria
- aggregated mean, median, p95, zero-three-night rate, runtime, and penalty breakdowns

This is a scaled browser model so the assessment UI can execute real comparisons. The largest dataset is browser-safe rather than production-large. In production, the same boundary should move to a backend job or Cloudflare Worker queue that runs the real five-minute optimizer on much larger snapshots.

## Level 1: JSON Dataset Input

The first production-like boundary is the dataset import step:

1. User pastes exported JSON into the `Dataset Input` panel.
2. The UI parses the text with `JSON.parse`.
3. Zod validates the required contract:
   - account name
   - department
   - workers
   - daily day/night requirements
   - optional worker availability and shift preferences
4. Cross-field validation checks that worker constraint dates exist in the requirements date range.
5. Deterministic normalization converts date strings into day indexes and fills missing target shifts from total demand.
6. The normalized snapshot becomes an imported benchmark dataset.
7. The scheduler runs the same current-vs-candidate algorithm comparison against this imported snapshot.

Extra fields are allowed because real exports often contain account metadata that the optimizer does not need. Unknown fields are ignored by the browser prototype, but the validated subset is explicit.

## Algorithm Tradeoffs

Greedy construction:

- fastest and lowest operational risk
- good for quick feasibility previews
- can get trapped in poor early choices

Greedy plus local repair:

- starts from the greedy schedule
- repeatedly proposes shift reassignments
- scores only the affected workers and local day window for each proposed move
- accepts only improving moves
- predictable, but can still get stuck in a local minimum

Simulated annealing-style search:

- starts from the greedy schedule
- proposes the same local reassignments
- scores candidate moves with the same incremental penalty delta
- sometimes accepts worse intermediate moves while temperature cools
- keeps the best schedule found
- slower, but useful for difficult constraint mixes

The first implementation rescored the full `staff * days` schedule matrix after every neighbor proposal. The current implementation keeps a score state and updates overtime, preferences, rest, fairness, and three-night blocks only for the two workers affected by the move. Coverage stays unchanged because the neighbor operation swaps one assigned worker with one available off worker on the same day and shift.

With:

- `D = days`
- `S = staff`
- `K = required shifts per day`
- `I = local-search iterations`

the prototype is now closer to:

- greedy construction: `O(D * K * S log S)`
- repair: `O(D * K * S log S + I * S)`
- annealing: `O(D * K * S log S + I * S)`

If we later maintain indexed candidate pools per shift/day, the local proposal step can be reduced further. For the assessment prototype, the important fix is that local search no longer multiplies every iteration by the full `D * S` schedule size.

## Implementation Safety

Before changing the optimizer, isolate the new penalty calculation behind a deterministic function:

```txt
calculateThreeConsecutiveNightsPenalty(schedule, weights)
```

Unit tests should cover no nights, one night, two nights, exactly three nights, four nights with overlapping triples, triples split by a day off, multiple workers, and month-boundary cases.

## Benchmark Data

Use fixed input snapshots, not live mutable customer data:

- baseline ICU month
- night-heavy emergency month
- small specialist team
- hard stress case with many absences
- at least one historical real customer case where three nights happened

Each snapshot should include staff, required shifts, absences, preferences, skills, existing rules, and the exact generator weight configuration.

## Run Count

For each dataset:

- run current algorithm 80 times
- run candidate algorithm 80 times
- record seed, input version, algorithm version, runtime, final schedule, and penalty breakdown

If runtime cost is too high, use 30 runs as a smoke gate and 80+ runs for release approval.

## Measurements

Primary measurements:

- mean three-night blocks per schedule
- percent of runs with zero three-night blocks
- total weighted penalty distribution

Regression measurements:

- all existing ~25 penalty components
- coverage gaps
- overtime
- unwanted shifts
- rest violations
- runtime
- infeasible or failed runs

Do not compare only the best run. Compare mean, median, p95, and distribution shape.

## Acceptance Gates

Candidate passes if:

- mean three-night blocks decreases on every benchmark
- percent of zero-three-night schedules increases on every benchmark
- total penalty does not regress beyond agreed tolerance
- no existing penalty component regresses beyond its threshold
- runtime remains inside the operational five-minute budget
- no new infeasible schedules or failed runs appear

Expected tolerances should be defined before looking at the result. Example:

- coverage regression: max 1%
- overtime regression: max 2%
- rest regression: max 2%
- unwanted shifts regression: max 4%
- runtime regression: max 10%

## Comparison Method

For every dataset and metric:

- compare current vs candidate distributions
- report absolute delta and percent delta
- show p50 and p95, not only mean
- keep raw run outputs for investigation
- use fixed seeds where possible to create paired comparisons

If the algorithm cannot be seeded today, add seed control or at least persist all random seeds as part of this work.

## Rollout

After offline validation:

- run on shadow traffic or copied production inputs
- show before/after penalty reports to support/product
- feature-flag the new penalty weight per account or cohort
- start with internal/customer pilot accounts
- monitor generated schedules, manual edits, support tickets, and runtime

The UI in `Generator Evaluation` represents this validation workflow with benchmark datasets, old vs new comparisons, penalty breakdowns, and gates.
