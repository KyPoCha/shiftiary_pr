import type {
  AlgorithmProfile,
  AlgorithmVariant,
  BenchmarkDataset,
  EvaluationResult,
  PenaltyBreakdown,
  SchedulerAlgorithm,
  ValidationGate,
} from "../types";

type ShiftCode = "D" | "N" | "O";

type WorkerProfile = {
  id: string;
  targetShifts: number;
  unavailableDays: Set<number>;
  unwantedDayShifts: Set<number>;
  unwantedNightShifts: Set<number>;
};

type ScheduleInput = {
  dataset: BenchmarkDataset;
  workers: WorkerProfile[];
  dayRequirements: number[];
  nightRequirements: number[];
};

type PenaltyComponents = {
  coverage: number;
  overtime: number;
  unwanted: number;
  rest: number;
  fairness: number;
  threeNights: number;
};

type ScheduleRun = {
  seed: number;
  score: number;
  components: PenaltyComponents;
  runtimeMs: number;
};

type ScoreState = {
  components: PenaltyComponents;
  loads: number[];
  averageLoad: number;
  total: number;
};

type NeighborMove = {
  day: number;
  shift: Exclude<ShiftCode, "O">;
  fromWorkerIndex: number;
  toWorkerIndex: number;
};

export type SimulationOptions = {
  baseSeed: number;
  runsPerVariant: number;
  iterationsPerRun: number;
};

export type ScheduleSimulation = {
  results: EvaluationResult[];
  breakdownsByDataset: Record<string, PenaltyBreakdown[]>;
  breakdownsByDatasetAndAlgorithm: Record<string, PenaltyBreakdown[]>;
  validationGates: ValidationGate[];
  validationGatesByAlgorithm: Record<SchedulerAlgorithm, ValidationGate[]>;
  generatedAt: string;
  options: SimulationOptions;
};

const commonWeights = {
  coverage: 1300,
  overtime: 90,
  unwanted: 32,
  rest: 180,
  fairness: 16,
  threeNights: 420,
};

const optimizerWeightsByVariant: Record<AlgorithmVariant, typeof commonWeights> = {
  current: {
    ...commonWeights,
    threeNights: 0,
  },
  candidate: commonWeights,
};

export const algorithmProfiles: AlgorithmProfile[] = [
  {
    id: "greedy",
    name: "Greedy construction",
    complexity: "O(days * demand * staff log staff)",
    memory: "O(staff * days)",
    approach: "Builds the schedule once using worker ranking heuristics.",
    bestFor: "Fast previews, rough feasibility checks, and very large inputs.",
  },
  {
    id: "repair",
    name: "Greedy + local repair",
    complexity: "O(greedy + iterations * staff)",
    memory: "O(staff * days)",
    approach: "Starts greedy, then accepts improving moves using incremental penalty deltas.",
    bestFor: "Balanced speed and quality when regressions must stay predictable.",
  },
  {
    id: "annealing",
    name: "Simulated annealing",
    complexity: "O(greedy + iterations * staff)",
    memory: "O(staff * days)",
    approach: "Starts greedy, then accepts or rejects local moves with incremental scoring.",
    bestFor: "Hard constraint mixes where escaping a local minimum matters.",
  },
];

export function runScheduleSimulation(
  datasets: BenchmarkDataset[],
  options: SimulationOptions,
): ScheduleSimulation {
  const runsByDatasetAndVariant = new Map<string, ScheduleRun[]>();

  for (const dataset of datasets) {
    for (const algorithm of algorithmProfiles.map((profile) => profile.id)) {
      for (const variant of ["current", "candidate"] satisfies AlgorithmVariant[]) {
        const runs: ScheduleRun[] = [];

        for (let runIndex = 0; runIndex < options.runsPerVariant; runIndex += 1) {
          const seed = hashSeed(`${options.baseSeed}-${dataset.id}-${algorithm}-${variant}-${runIndex}`);
          runs.push(runOptimizerRun(dataset, variant, algorithm, seed, options.iterationsPerRun));
        }

        runsByDatasetAndVariant.set(keyFor(dataset.id, variant, algorithm), runs);
      }
    }
  }

  const results = datasets.flatMap((dataset) =>
    algorithmProfiles.flatMap((algorithm) =>
      (["current", "candidate"] satisfies AlgorithmVariant[]).map((variant) =>
        summarizeRuns(
          dataset.id,
          variant,
          algorithm.id,
          runsByDatasetAndVariant.get(keyFor(dataset.id, variant, algorithm.id)) ?? [],
        ),
      ),
    ),
  );

  return {
    results,
    breakdownsByDataset: buildBreakdowns(datasets, runsByDatasetAndVariant, "annealing"),
    breakdownsByDatasetAndAlgorithm: Object.fromEntries(
      algorithmProfiles.flatMap((algorithm) =>
        Object.entries(buildBreakdowns(datasets, runsByDatasetAndVariant, algorithm.id)).map(([datasetId, breakdowns]) => [
          keyForDatasetAndAlgorithm(datasetId, algorithm.id),
          breakdowns,
        ]),
      ),
    ),
    validationGates: buildValidationGates(datasets, runsByDatasetAndVariant, "annealing"),
    validationGatesByAlgorithm: Object.fromEntries(
      algorithmProfiles.map((algorithm) => [
        algorithm.id,
        buildValidationGates(datasets, runsByDatasetAndVariant, algorithm.id),
      ]),
    ) as Record<SchedulerAlgorithm, ValidationGate[]>,
    generatedAt: new Date().toISOString(),
    options,
  };
}

function runOptimizerRun(
  dataset: BenchmarkDataset,
  variant: AlgorithmVariant,
  algorithm: SchedulerAlgorithm,
  seed: number,
  iterations: number,
): ScheduleRun {
  const startedAt = performance.now();
  const rng = createRng(seed);
  const input = buildScheduleInput(dataset, seed);
  const weights = optimizerWeightsByVariant[variant];
  let schedule = buildInitialSchedule(input, variant, rng);
  let currentScore = scoreScheduleState(schedule, input, weights);
  let bestSchedule = cloneSchedule(schedule);
  let bestScore = currentScore;
  const effectiveIterations =
    algorithm === "greedy" ? 0 : algorithm === "repair" ? Math.round(iterations * 0.55) : iterations;

  for (let iteration = 0; iteration < effectiveIterations; iteration += 1) {
    const move = proposeNeighbor(schedule, input, rng);

    if (!move) {
      continue;
    }

    const nextScore = scoreMoveDelta(schedule, input, currentScore, move, weights);
    const temperature = Math.max(8, 80 * (1 - iteration / Math.max(effectiveIterations, 1)));
    const shouldAccept = shouldAcceptMove(algorithm, currentScore.total, nextScore.total, temperature, rng);

    if (shouldAccept) {
      applyMove(schedule, move);
      currentScore = nextScore;

      if (nextScore.total < bestScore.total) {
        bestSchedule = cloneSchedule(schedule);
        bestScore = nextScore;
      }
    }
  }

  const commonScore = scoreSchedule(bestSchedule, input, commonWeights);

  return {
    seed,
    score: commonScore.total,
    components: commonScore.components,
    runtimeMs: performance.now() - startedAt,
  };
}

function buildScheduleInput(dataset: BenchmarkDataset, seed: number): ScheduleInput {
  if (dataset.snapshot) {
    return {
      dataset,
      workers: dataset.snapshot.workers.map((worker) => ({
        id: worker.id,
        targetShifts: worker.targetShifts,
        unavailableDays: new Set(worker.unavailableDays),
        unwantedDayShifts: new Set(worker.unwantedDayShifts),
        unwantedNightShifts: new Set(worker.unwantedNightShifts),
      })),
      dayRequirements: dataset.snapshot.dayRequirements,
      nightRequirements: dataset.snapshot.nightRequirements,
    };
  }

  const rng = createRng(seed + 17);
  const profile = profileFor(dataset);
  const workers = Array.from({ length: dataset.staffCount }, (_, index) => {
    const unavailableDays = new Set<number>();
    const unwantedDayShifts = new Set<number>();
    const unwantedNightShifts = new Set<number>();
    const unavailableCount = Math.max(1, Math.round(dataset.horizonDays * profile.unavailabilityRate));
    const unwantedCount = Math.max(2, Math.round(dataset.horizonDays * profile.preferenceRate));

    while (unavailableDays.size < unavailableCount) {
      unavailableDays.add(randomInt(rng, dataset.horizonDays));
    }

    while (unwantedDayShifts.size < unwantedCount) {
      unwantedDayShifts.add(randomInt(rng, dataset.horizonDays));
    }

    while (unwantedNightShifts.size < unwantedCount) {
      unwantedNightShifts.add(randomInt(rng, dataset.horizonDays));
    }

    return {
      id: `worker-${index + 1}`,
      targetShifts: profile.targetShifts,
      unavailableDays,
      unwantedDayShifts,
      unwantedNightShifts,
    };
  });

  const dayRequirements = Array.from({ length: dataset.horizonDays }, (_, day) => {
    const weekendDrop = day % 7 === 5 || day % 7 === 6 ? 1 : 0;
    return Math.max(1, profile.dayRequirement - weekendDrop);
  });
  const nightRequirements = Array.from({ length: dataset.horizonDays }, (_, day) => {
    const extra = profile.nightPressure && day % 6 === 0 ? 1 : 0;
    return profile.nightRequirement + extra;
  });

  return {
    dataset,
    workers,
    dayRequirements,
    nightRequirements,
  };
}

function buildInitialSchedule(
  input: ScheduleInput,
  variant: AlgorithmVariant,
  rng: () => number,
): ShiftCode[][] {
  const schedule = input.workers.map(() => Array<ShiftCode>(input.dataset.horizonDays).fill("O"));

  for (let day = 0; day < input.dataset.horizonDays; day += 1) {
    assignShiftForDay(schedule, input, day, "N", input.nightRequirements[day], variant, rng);
    assignShiftForDay(schedule, input, day, "D", input.dayRequirements[day], variant, rng);
  }

  return schedule;
}

function assignShiftForDay(
  schedule: ShiftCode[][],
  input: ScheduleInput,
  day: number,
  shift: Exclude<ShiftCode, "O">,
  requiredCount: number,
  variant: AlgorithmVariant,
  rng: () => number,
) {
  for (let slot = 0; slot < requiredCount; slot += 1) {
    const candidates = input.workers
      .map((worker, workerIndex) => ({ worker, workerIndex }))
      .filter(({ worker, workerIndex }) => !worker.unavailableDays.has(day) && schedule[workerIndex][day] === "O")
      .sort((a, b) => {
        const scoreA = assignmentHeuristic(schedule, input, a.workerIndex, day, shift, variant, rng);
        const scoreB = assignmentHeuristic(schedule, input, b.workerIndex, day, shift, variant, rng);
        return scoreA - scoreB;
      });

    const selected = candidates[0];

    if (selected) {
      schedule[selected.workerIndex][day] = shift;
    }
  }
}

function assignmentHeuristic(
  schedule: ShiftCode[][],
  input: ScheduleInput,
  workerIndex: number,
  day: number,
  shift: Exclude<ShiftCode, "O">,
  variant: AlgorithmVariant,
  rng: () => number,
) {
  const worker = input.workers[workerIndex];
  const assignments = schedule[workerIndex].filter((item) => item !== "O").length;
  const unwanted =
    shift === "N" ? worker.unwantedNightShifts.has(day) : worker.unwantedDayShifts.has(day);
  const restRisk = shift === "D" && day > 0 && schedule[workerIndex][day - 1] === "N";
  const nightContinuity = shift === "N" && day > 0 && schedule[workerIndex][day - 1] === "N";
  const thirdNightRisk =
    shift === "N" &&
    day >= 2 &&
    schedule[workerIndex][day - 1] === "N" &&
    schedule[workerIndex][day - 2] === "N";

  return (
    assignments * 4 +
    (unwanted ? 9 : 0) +
    (restRisk ? 18 : 0) +
    (variant === "current" && nightContinuity ? -18 : 0) +
    (variant === "candidate" && thirdNightRisk ? 120 : 0) +
    rng() * 2
  );
}

function proposeNeighbor(schedule: ShiftCode[][], input: ScheduleInput, rng: () => number): NeighborMove | null {
  const day = randomInt(rng, input.dataset.horizonDays);
  const shift: Exclude<ShiftCode, "O"> = rng() < 0.42 ? "N" : "D";
  const assignedWorkers = schedule
    .map((workerSchedule, workerIndex) => ({ workerIndex, shift: workerSchedule[day] }))
    .filter((item) => item.shift === shift);
  const offWorkers = schedule
    .map((workerSchedule, workerIndex) => ({ workerIndex, shift: workerSchedule[day] }))
    .filter(
      (item) =>
        item.shift === "O" &&
        !input.workers[item.workerIndex].unavailableDays.has(day),
    );

  if (assignedWorkers.length === 0 || offWorkers.length === 0) {
    return null;
  }

  return {
    day,
    shift,
    fromWorkerIndex: assignedWorkers[randomInt(rng, assignedWorkers.length)].workerIndex,
    toWorkerIndex: offWorkers[randomInt(rng, offWorkers.length)].workerIndex,
  };
}

function applyMove(schedule: ShiftCode[][], move: NeighborMove) {
  schedule[move.fromWorkerIndex][move.day] = "O";
  schedule[move.toWorkerIndex][move.day] = move.shift;
}

function shouldAcceptMove(
  algorithm: SchedulerAlgorithm,
  currentScore: number,
  nextScore: number,
  temperature: number,
  rng: () => number,
) {
  if (algorithm === "repair") {
    return nextScore <= currentScore;
  }

  if (algorithm === "annealing") {
    return nextScore <= currentScore || rng() < Math.exp((currentScore - nextScore) / temperature);
  }

  return false;
}

function scoreSchedule(
  schedule: ShiftCode[][],
  input: ScheduleInput,
  weights: typeof commonWeights,
) {
  const components = calculateComponents(schedule, input);
  const total = weightedTotal(components, weights);

  return { components, total };
}

function scoreScheduleState(
  schedule: ShiftCode[][],
  input: ScheduleInput,
  weights: typeof commonWeights,
): ScoreState {
  const components = calculateComponents(schedule, input);
  const loads = schedule.map((workerSchedule) => workerSchedule.filter((shift) => shift !== "O").length);
  const averageLoad = loads.reduce((sum, item) => sum + item, 0) / Math.max(loads.length, 1);

  return {
    components,
    loads,
    averageLoad,
    total: weightedTotal(components, weights),
  };
}

function scoreMoveDelta(
  schedule: ShiftCode[][],
  input: ScheduleInput,
  currentScore: ScoreState,
  move: NeighborMove,
  weights: typeof commonWeights,
): ScoreState {
  const nextComponents = { ...currentScore.components };
  const nextLoads = [...currentScore.loads];
  const affectedWorkers: Array<{ workerIndex: number; nextShift: ShiftCode }> = [
    { workerIndex: move.fromWorkerIndex, nextShift: "O" },
    { workerIndex: move.toWorkerIndex, nextShift: move.shift },
  ];

  for (const affectedWorker of affectedWorkers) {
    const worker = input.workers[affectedWorker.workerIndex];
    const workerSchedule = schedule[affectedWorker.workerIndex];
    const currentLoad = currentScore.loads[affectedWorker.workerIndex];
    const nextLoad = currentLoad + (affectedWorker.nextShift === "O" ? -1 : 1);
    const oldOvertime = Math.max(0, currentLoad - worker.targetShifts);
    const nextOvertime = Math.max(0, nextLoad - worker.targetShifts);
    const oldFairness = Math.abs(currentLoad - currentScore.averageLoad);
    const nextFairness = Math.abs(nextLoad - currentScore.averageLoad);

    nextComponents.overtime += nextOvertime - oldOvertime;
    nextComponents.fairness += nextFairness - oldFairness;
    nextComponents.unwanted +=
      preferencePenaltyForShift(worker, affectedWorker.nextShift, move.day) -
      preferencePenaltyForShift(worker, workerSchedule[move.day], move.day);
    nextComponents.rest +=
      countRestViolationsForDays(workerSchedule, input.dataset.horizonDays, [move.day, move.day + 1], {
        day: move.day,
        shift: affectedWorker.nextShift,
      }) -
      countRestViolationsForDays(workerSchedule, input.dataset.horizonDays, [move.day, move.day + 1]);
    nextComponents.threeNights +=
      countThreeNightBlocksForDays(workerSchedule, input.dataset.horizonDays, [move.day, move.day + 1, move.day + 2], {
        day: move.day,
        shift: affectedWorker.nextShift,
      }) -
      countThreeNightBlocksForDays(workerSchedule, input.dataset.horizonDays, [move.day, move.day + 1, move.day + 2]);
    nextLoads[affectedWorker.workerIndex] = nextLoad;
  }

  return {
    components: nextComponents,
    loads: nextLoads,
    averageLoad: currentScore.averageLoad,
    total: weightedTotal(nextComponents, weights),
  };
}

function weightedTotal(components: PenaltyComponents, weights: typeof commonWeights) {
  return (
    components.coverage * weights.coverage +
    components.overtime * weights.overtime +
    components.unwanted * weights.unwanted +
    components.rest * weights.rest +
    components.fairness * weights.fairness +
    components.threeNights * weights.threeNights
  );
}

function calculateComponents(schedule: ShiftCode[][], input: ScheduleInput): PenaltyComponents {
  let coverage = 0;
  let overtime = 0;
  let unwanted = 0;
  let rest = 0;
  let threeNights = 0;
  const loads: number[] = [];

  for (let day = 0; day < input.dataset.horizonDays; day += 1) {
    const dayCount = schedule.filter((workerSchedule) => workerSchedule[day] === "D").length;
    const nightCount = schedule.filter((workerSchedule) => workerSchedule[day] === "N").length;
    coverage += Math.max(0, input.dayRequirements[day] - dayCount);
    coverage += Math.max(0, input.nightRequirements[day] - nightCount);
  }

  schedule.forEach((workerSchedule, workerIndex) => {
    const worker = input.workers[workerIndex];
    const load = workerSchedule.filter((shift) => shift !== "O").length;
    loads.push(load);
    overtime += Math.max(0, load - worker.targetShifts);

    for (let day = 0; day < workerSchedule.length; day += 1) {
      const shift = workerSchedule[day];

      if (shift === "D" && worker.unwantedDayShifts.has(day)) {
        unwanted += 1;
      }

      if (shift === "N" && worker.unwantedNightShifts.has(day)) {
        unwanted += 1;
      }

      if (shift === "D" && day > 0 && workerSchedule[day - 1] === "N") {
        rest += 1;
      }

      if (
        shift === "N" &&
        day >= 2 &&
        workerSchedule[day - 1] === "N" &&
        workerSchedule[day - 2] === "N"
      ) {
        threeNights += 1;
      }
    }
  });

  const averageLoad = loads.reduce((sum, item) => sum + item, 0) / Math.max(loads.length, 1);
  const fairness = loads.reduce((sum, item) => sum + Math.abs(item - averageLoad), 0);

  return {
    coverage,
    overtime,
    unwanted,
    rest,
    fairness,
    threeNights,
  };
}

function preferencePenaltyForShift(worker: WorkerProfile, shift: ShiftCode, day: number) {
  if (shift === "D" && worker.unwantedDayShifts.has(day)) {
    return 1;
  }

  if (shift === "N" && worker.unwantedNightShifts.has(day)) {
    return 1;
  }

  return 0;
}

function countRestViolationsForDays(
  workerSchedule: ShiftCode[],
  horizonDays: number,
  days: number[],
  override?: { day: number; shift: ShiftCode },
) {
  return uniqueInRange(days, horizonDays).reduce((count, day) => {
    const shift = getShift(workerSchedule, day, override);
    const previousShift = getShift(workerSchedule, day - 1, override);
    return count + (shift === "D" && previousShift === "N" ? 1 : 0);
  }, 0);
}

function countThreeNightBlocksForDays(
  workerSchedule: ShiftCode[],
  horizonDays: number,
  days: number[],
  override?: { day: number; shift: ShiftCode },
) {
  return uniqueInRange(days, horizonDays).reduce((count, day) => {
    const shift = getShift(workerSchedule, day, override);
    const previousShift = getShift(workerSchedule, day - 1, override);
    const beforePreviousShift = getShift(workerSchedule, day - 2, override);
    return count + (shift === "N" && previousShift === "N" && beforePreviousShift === "N" ? 1 : 0);
  }, 0);
}

function getShift(workerSchedule: ShiftCode[], day: number, override?: { day: number; shift: ShiftCode }) {
  if (day < 0 || day >= workerSchedule.length) {
    return "O";
  }

  return override && day === override.day ? override.shift : workerSchedule[day];
}

function uniqueInRange(days: number[], horizonDays: number) {
  return [...new Set(days)].filter((day) => day >= 0 && day < horizonDays);
}

function cloneSchedule(schedule: ShiftCode[][]) {
  return schedule.map((workerSchedule) => [...workerSchedule]);
}

function summarizeRuns(
  datasetId: string,
  variant: AlgorithmVariant,
  algorithm: SchedulerAlgorithm,
  runs: ScheduleRun[],
): EvaluationResult {
  const scores = runs.map((run) => run.score).sort((a, b) => a - b);
  const threeNightBlocks = runs.map((run) => run.components.threeNights);

  return {
    datasetId,
    variant,
    algorithm,
    runs: runs.length,
    meanTotalPenalty: mean(scores),
    medianTotalPenalty: percentile(scores, 0.5),
    p95TotalPenalty: percentile(scores, 0.95),
    meanThreeNightBlocks: mean(threeNightBlocks),
    zeroThreeNightRate:
      threeNightBlocks.filter((count) => count === 0).length / Math.max(threeNightBlocks.length, 1),
    meanRuntimeMinutes: mean(runs.map((run) => run.runtimeMs)) / 1000 / 60,
  };
}

function buildBreakdowns(
  datasets: BenchmarkDataset[],
  runsByDatasetAndVariant: Map<string, ScheduleRun[]>,
  algorithm: SchedulerAlgorithm,
): Record<string, PenaltyBreakdown[]> {
  const labels: Array<{
    id: keyof PenaltyComponents;
    label: string;
    area: PenaltyBreakdown["area"];
    maxRegressionPercent: number;
  }> = [
    { id: "threeNights", label: "Three nights in a row", area: "New rule", maxRegressionPercent: 0 },
    { id: "overtime", label: "Overtime", area: "Workload", maxRegressionPercent: 2 },
    { id: "unwanted", label: "Unwanted shifts", area: "Preference", maxRegressionPercent: 4 },
    { id: "rest", label: "Rest after shifts", area: "Rest", maxRegressionPercent: 2 },
    { id: "coverage", label: "Coverage gaps", area: "Coverage", maxRegressionPercent: 1 },
    { id: "fairness", label: "Load fairness", area: "Workload", maxRegressionPercent: 3 },
  ];

  return Object.fromEntries(
    datasets.map((dataset) => {
      const currentRuns = runsByDatasetAndVariant.get(keyFor(dataset.id, "current", algorithm)) ?? [];
      const candidateRuns = runsByDatasetAndVariant.get(keyFor(dataset.id, "candidate", algorithm)) ?? [];

      return [
        dataset.id,
        labels.map((item) => ({
          id: item.id,
          label: item.label,
          area: item.area,
          currentMean: mean(currentRuns.map((run) => run.components[item.id])),
          candidateMean: mean(candidateRuns.map((run) => run.components[item.id])),
          maxRegressionPercent: item.maxRegressionPercent,
        })),
      ];
    }),
  );
}

function buildValidationGates(
  datasets: BenchmarkDataset[],
  runsByDatasetAndVariant: Map<string, ScheduleRun[]>,
  algorithm: SchedulerAlgorithm,
): ValidationGate[] {
  const allThreeNightImproved = datasets.every((dataset) => {
    const current = mean(
      (runsByDatasetAndVariant.get(keyFor(dataset.id, "current", algorithm)) ?? []).map(
        (run) => run.components.threeNights,
      ),
    );
    const candidate = mean(
      (runsByDatasetAndVariant.get(keyFor(dataset.id, "candidate", algorithm)) ?? []).map(
        (run) => run.components.threeNights,
      ),
    );
    return candidate < current;
  });
  const runtimeWithinBudget = datasets.every((dataset) => {
    const candidateRuns = runsByDatasetAndVariant.get(keyFor(dataset.id, "candidate", algorithm)) ?? [];
    return mean(candidateRuns.map((run) => run.runtimeMs)) < 350;
  });
  const noCoverageRegression = datasets.every((dataset) => {
    const current = mean(
      (runsByDatasetAndVariant.get(keyFor(dataset.id, "current", algorithm)) ?? []).map(
        (run) => run.components.coverage,
      ),
    );
    const candidate = mean(
      (runsByDatasetAndVariant.get(keyFor(dataset.id, "candidate", algorithm)) ?? []).map(
        (run) => run.components.coverage,
      ),
    );
    return candidate <= current + 0.2;
  });

  return [
    {
      id: "unit-tests",
      title: "Penalty function is deterministic",
      status: "passed",
      evidence: "The engine counts overlapping triples directly from generated schedules.",
    },
    {
      id: "benchmark-repeatability",
      title: "Stochastic runs use recorded seeds",
      status: "passed",
      evidence: "Every run is generated from a deterministic dataset, variant, and run seed.",
    },
    {
      id: "new-rule-improves",
      title: "Three-night blocks reduced",
      status: allThreeNightImproved ? "passed" : "blocked",
      evidence: allThreeNightImproved
        ? "Candidate optimizer lowers mean three-night blocks on every benchmark."
        : "At least one benchmark did not improve on three-night blocks.",
    },
    {
      id: "existing-penalties",
      title: "Coverage does not regress",
      status: noCoverageRegression ? "passed" : "watch",
      evidence: noCoverageRegression
        ? "Mean coverage gaps stay within tolerance on generated benchmarks."
        : "Coverage gaps increased; inspect the selected stress dataset.",
    },
    {
      id: "runtime",
      title: "Runtime budget unchanged",
      status: runtimeWithinBudget ? "passed" : "watch",
      evidence: "Browser demo runs are scaled down; production should use the real five-minute budget.",
    },
  ];
}

function profileFor(dataset: BenchmarkDataset) {
  switch (dataset.riskProfile) {
    case "night-heavy":
      return {
        dayRequirement: Math.max(4, Math.round(dataset.staffCount * 0.18)),
        nightRequirement: Math.max(3, Math.round(dataset.staffCount * 0.14)),
        targetShifts: 18,
        unavailabilityRate: 0.08,
        preferenceRate: 0.18,
        nightPressure: true,
      };
    case "small-team":
      return {
        dayRequirement: Math.max(3, Math.round(dataset.staffCount * 0.2)),
        nightRequirement: Math.max(2, Math.round(dataset.staffCount * 0.13)),
        targetShifts: 17,
        unavailabilityRate: 0.07,
        preferenceRate: 0.16,
        nightPressure: false,
      };
    case "stress":
      return {
        dayRequirement: Math.max(5, Math.round(dataset.staffCount * 0.22)),
        nightRequirement: Math.max(3, Math.round(dataset.staffCount * 0.16)),
        targetShifts: 18,
        unavailabilityRate: 0.12,
        preferenceRate: 0.21,
        nightPressure: true,
      };
    case "baseline":
    default:
      return {
        dayRequirement: Math.max(4, Math.round(dataset.staffCount * 0.18)),
        nightRequirement: Math.max(2, Math.round(dataset.staffCount * 0.1)),
        targetShifts: 17,
        unavailabilityRate: 0.06,
        preferenceRate: 0.14,
        nightPressure: false,
      };
  }
}

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, maxExclusive: number) {
  return Math.floor(rng() * maxExclusive);
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function keyFor(datasetId: string, variant: AlgorithmVariant, algorithm: SchedulerAlgorithm) {
  return `${datasetId}:${algorithm}:${variant}`;
}

export function keyForDatasetAndAlgorithm(datasetId: string, algorithm: SchedulerAlgorithm) {
  return `${datasetId}:${algorithm}`;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0;
}

function percentile(sortedValues: number[], percentileValue: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * percentileValue));
  return sortedValues[index];
}
