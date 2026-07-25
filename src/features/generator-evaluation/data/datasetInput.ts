import { z } from "zod";
import type { BenchmarkDataset, ScheduleDatasetSnapshot } from "../types";

export type DatasetInputValidation =
  | {
      status: "valid";
      dataset: BenchmarkDataset;
      summary: DatasetInputSummary;
      issues: string[];
    }
  | {
      status: "invalid";
      summary: null;
      issues: string[];
    };

export type DatasetInputSummary = {
  accountName: string;
  department: string;
  horizonDays: number;
  staffCount: number;
  totalRequiredShifts: number;
  totalNightShifts: number;
  unavailableEntries: number;
  preferenceEntries: number;
};

const dateSchema = z
  .string()
  .min(8)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use ISO date strings such as 2026-08-01.");

const exportedWorkerSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    targetShifts: z.number().int().min(1).max(90).optional(),
    unavailableDates: z.array(dateSchema).default([]),
    unwantedDayDates: z.array(dateSchema).default([]),
    unwantedNightDates: z.array(dateSchema).default([]),
  })
  .passthrough();

const exportedRequirementSchema = z
  .object({
    date: dateSchema,
    day: z.number().int().min(0).max(500),
    night: z.number().int().min(0).max(500),
  })
  .passthrough();

const exportedDatasetSchema = z
  .object({
    accountId: z.string().min(1).optional(),
    accountName: z.string().min(1),
    department: z.string().min(1),
    historicalMonths: z.number().int().min(0).max(120).default(0),
    workers: z.array(exportedWorkerSchema).min(1).max(500),
    requirements: z.array(exportedRequirementSchema).min(1).max(366),
    rules: z.record(z.unknown()).optional(),
  })
  .passthrough();

type ExportedDataset = z.infer<typeof exportedDatasetSchema>;

export const sampleScheduleExportJson = JSON.stringify(
  {
    accountId: "motol-icu-import",
    accountName: "Motol ICU imported snapshot",
    department: "JIP",
    historicalMonths: 6,
    rules: {
      maxConsecutiveNights: 2,
      minRestHoursAfterNight: 24,
    },
    workers: [
      {
        id: "nurse-001",
        name: "Petra Novakova",
        targetShifts: 8,
        unavailableDates: ["2026-08-05", "2026-08-06"],
        unwantedDayDates: ["2026-08-10"],
        unwantedNightDates: ["2026-08-02", "2026-08-11"],
      },
      {
        id: "nurse-002",
        name: "Jan Svoboda",
        targetShifts: 8,
        unavailableDates: ["2026-08-07"],
        unwantedDayDates: ["2026-08-04"],
        unwantedNightDates: ["2026-08-08"],
      },
      {
        id: "nurse-003",
        name: "Eva Dvorakova",
        targetShifts: 7,
        unavailableDates: ["2026-08-12"],
        unwantedDayDates: ["2026-08-06"],
        unwantedNightDates: ["2026-08-01", "2026-08-09"],
      },
      {
        id: "nurse-004",
        name: "Tomas Prochazka",
        targetShifts: 8,
        unavailableDates: ["2026-08-03"],
        unwantedDayDates: ["2026-08-13"],
        unwantedNightDates: ["2026-08-07"],
      },
      {
        id: "nurse-005",
        name: "Lucie Cerna",
        targetShifts: 8,
        unavailableDates: ["2026-08-09"],
        unwantedDayDates: ["2026-08-02"],
        unwantedNightDates: ["2026-08-05", "2026-08-14"],
      },
      {
        id: "nurse-006",
        name: "Marek Vesely",
        targetShifts: 7,
        unavailableDates: ["2026-08-10"],
        unwantedDayDates: ["2026-08-01"],
        unwantedNightDates: ["2026-08-04"],
      },
      {
        id: "nurse-007",
        name: "Karolina Mala",
        targetShifts: 7,
        unavailableDates: ["2026-08-01", "2026-08-02"],
        unwantedDayDates: ["2026-08-08"],
        unwantedNightDates: ["2026-08-12"],
      },
      {
        id: "nurse-008",
        name: "Ondrej Marek",
        targetShifts: 7,
        unavailableDates: ["2026-08-14"],
        unwantedDayDates: ["2026-08-05"],
        unwantedNightDates: ["2026-08-03"],
      },
      {
        id: "nurse-009",
        name: "Alena Kralova",
        targetShifts: 8,
        unavailableDates: ["2026-08-04"],
        unwantedDayDates: ["2026-08-11"],
        unwantedNightDates: ["2026-08-06"],
      },
      {
        id: "nurse-010",
        name: "Filip Horak",
        targetShifts: 7,
        unavailableDates: ["2026-08-11"],
        unwantedDayDates: ["2026-08-03"],
        unwantedNightDates: ["2026-08-10"],
      },
      {
        id: "nurse-011",
        name: "Sarka Urbanova",
        targetShifts: 7,
        unavailableDates: ["2026-08-08"],
        unwantedDayDates: ["2026-08-12"],
        unwantedNightDates: ["2026-08-01"],
      },
      {
        id: "nurse-012",
        name: "Roman Fiala",
        targetShifts: 7,
        unavailableDates: ["2026-08-13"],
        unwantedDayDates: ["2026-08-07"],
        unwantedNightDates: ["2026-08-09"],
      },
    ],
    requirements: Array.from({ length: 14 }, (_, index) => {
      const date = `2026-08-${String(index + 1).padStart(2, "0")}`;
      const isWeekend = index % 7 === 5 || index % 7 === 6;

      return {
        date,
        day: isWeekend ? 3 : 4,
        night: index % 4 === 0 ? 3 : 2,
      };
    }),
  },
  null,
  2,
);

export function validateScheduleExportJson(value: string): DatasetInputValidation {
  let rawValue: unknown;

  try {
    rawValue = JSON.parse(value);
  } catch (error) {
    return {
      status: "invalid",
      summary: null,
      issues: [`JSON parse failed: ${error instanceof Error ? error.message : "Invalid JSON."}`],
    };
  }

  const parsed = exportedDatasetSchema.safeParse(rawValue);

  if (!parsed.success) {
    return {
      status: "invalid",
      summary: null,
      issues: parsed.error.issues.map((issue) => `${formatPath(issue.path)}: ${issue.message}`),
    };
  }

  const crossFieldIssues = validateDateReferences(parsed.data);

  if (crossFieldIssues.length > 0) {
    return {
      status: "invalid",
      summary: null,
      issues: crossFieldIssues,
    };
  }

  const snapshot = normalizeSnapshot(parsed.data);
  const summary = summarizeDataset(parsed.data, snapshot);
  const dataset: BenchmarkDataset = {
    id: `imported-${stableHash(`${parsed.data.accountId ?? parsed.data.accountName}-${parsed.data.department}`)}`,
    name: parsed.data.accountName,
    department: parsed.data.department,
    horizonDays: summary.horizonDays,
    staffCount: summary.staffCount,
    historicalMonths: parsed.data.historicalMonths,
    riskProfile: inferRiskProfile(summary),
    source: "imported",
    snapshot,
    description: `${summary.horizonDays} day imported snapshot with ${summary.staffCount} workers and ${summary.totalRequiredShifts} required shifts.`,
  };

  return {
    status: "valid",
    dataset,
    summary,
    issues: [],
  };
}

function normalizeSnapshot(dataset: ExportedDataset): ScheduleDatasetSnapshot {
  const dateIndexes = buildDateIndexes(dataset);
  const totalRequiredShifts = dataset.requirements.reduce((sum, item) => sum + item.day + item.night, 0);
  const defaultTargetShifts = Math.max(1, Math.round(totalRequiredShifts / dataset.workers.length));

  return {
    workers: dataset.workers.map((worker) => ({
      id: worker.id,
      name: worker.name,
      targetShifts: worker.targetShifts ?? defaultTargetShifts,
      unavailableDays: toDayIndexes(worker.unavailableDates, dateIndexes),
      unwantedDayShifts: toDayIndexes(worker.unwantedDayDates, dateIndexes),
      unwantedNightShifts: toDayIndexes(worker.unwantedNightDates, dateIndexes),
    })),
    dayRequirements: dataset.requirements.map((requirement) => requirement.day),
    nightRequirements: dataset.requirements.map((requirement) => requirement.night),
  };
}

function summarizeDataset(dataset: ExportedDataset, snapshot: ScheduleDatasetSnapshot): DatasetInputSummary {
  const totalRequiredShifts =
    snapshot.dayRequirements.reduce((sum, item) => sum + item, 0) +
    snapshot.nightRequirements.reduce((sum, item) => sum + item, 0);
  const totalNightShifts = snapshot.nightRequirements.reduce((sum, item) => sum + item, 0);

  return {
    accountName: dataset.accountName,
    department: dataset.department,
    horizonDays: dataset.requirements.length,
    staffCount: dataset.workers.length,
    totalRequiredShifts,
    totalNightShifts,
    unavailableEntries: snapshot.workers.reduce((sum, worker) => sum + worker.unavailableDays.length, 0),
    preferenceEntries: snapshot.workers.reduce(
      (sum, worker) => sum + worker.unwantedDayShifts.length + worker.unwantedNightShifts.length,
      0,
    ),
  };
}

function validateDateReferences(dataset: ExportedDataset) {
  const dateIndexes = buildDateIndexes(dataset);
  const issues: string[] = [];

  dataset.workers.forEach((worker, workerIndex) => {
    [
      ["unavailableDates", worker.unavailableDates],
      ["unwantedDayDates", worker.unwantedDayDates],
      ["unwantedNightDates", worker.unwantedNightDates],
    ].forEach(([field, dates]) => {
      (dates as string[]).forEach((date) => {
        if (!dateIndexes.has(toDateKey(date))) {
          issues.push(`workers.${workerIndex}.${field}: ${date} is outside the requirements date range.`);
        }
      });
    });
  });

  return issues;
}

function buildDateIndexes(dataset: ExportedDataset) {
  return new Map(dataset.requirements.map((requirement, index) => [toDateKey(requirement.date), index]));
}

function toDayIndexes(dates: string[], dateIndexes: Map<string, number>) {
  return dates
    .map((date) => dateIndexes.get(toDateKey(date)))
    .filter((dayIndex): dayIndex is number => typeof dayIndex === "number");
}

function toDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function inferRiskProfile(summary: DatasetInputSummary): BenchmarkDataset["riskProfile"] {
  const averageNightDemand = summary.totalNightShifts / Math.max(summary.horizonDays, 1);
  const shiftsPerWorker = summary.totalRequiredShifts / Math.max(summary.staffCount, 1);

  if (summary.staffCount < 22) {
    return "small-team";
  }

  if (shiftsPerWorker > 19 || summary.unavailableEntries > summary.staffCount * 1.2) {
    return "stress";
  }

  if (averageNightDemand >= Math.max(3, summary.staffCount * 0.12)) {
    return "night-heavy";
  }

  return "baseline";
}

function formatPath(path: Array<string | number>) {
  return path.length > 0 ? path.join(".") : "root";
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}
