export type GeneratorEvaluationSection =
  | "benchmark-datasets"
  | "old-vs-new"
  | "penalty-breakdown"
  | "validation-methodology";

export type BenchmarkDataset = {
  id: string;
  name: string;
  department: string;
  horizonDays: number;
  staffCount: number;
  historicalMonths: number;
  riskProfile: "baseline" | "night-heavy" | "small-team" | "stress";
  description: string;
  source: "demo" | "imported";
  snapshot?: ScheduleDatasetSnapshot;
};

export type ScheduleDatasetSnapshot = {
  workers: ScheduleWorkerSnapshot[];
  dayRequirements: number[];
  nightRequirements: number[];
};

export type ScheduleWorkerSnapshot = {
  id: string;
  name?: string;
  targetShifts: number;
  unavailableDays: number[];
  unwantedDayShifts: number[];
  unwantedNightShifts: number[];
};

export type AlgorithmVariant = "current" | "candidate";

export type SchedulerAlgorithm = "greedy" | "repair" | "annealing";

export type AlgorithmProfile = {
  id: SchedulerAlgorithm;
  name: string;
  complexity: string;
  memory: string;
  approach: string;
  bestFor: string;
};

export type EvaluationResult = {
  datasetId: string;
  variant: AlgorithmVariant;
  algorithm: SchedulerAlgorithm;
  runs: number;
  meanTotalPenalty: number;
  medianTotalPenalty: number;
  p95TotalPenalty: number;
  meanThreeNightBlocks: number;
  zeroThreeNightRate: number;
  meanRuntimeMinutes: number;
};

export type PenaltyBreakdown = {
  id: string;
  label: string;
  area: "Workload" | "Preference" | "Rest" | "Coverage" | "New rule";
  currentMean: number;
  candidateMean: number;
  maxRegressionPercent: number;
};

export type ValidationGate = {
  id: string;
  title: string;
  status: "passed" | "watch" | "blocked";
  evidence: string;
};
