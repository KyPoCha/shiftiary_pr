import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileJson,
  FlaskConical,
  Gauge,
  Loader2,
  Moon,
  Play,
  Timer,
} from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import { benchmarkDatasets } from "../data/evaluationData";
import {
  sampleScheduleExportJson,
  validateScheduleExportJson,
  type DatasetInputSummary,
  type DatasetInputValidation,
} from "../data/datasetInput";
import {
  algorithmProfiles,
  keyForDatasetAndAlgorithm,
  runScheduleSimulation,
  type ScheduleSimulation,
} from "../engine/scheduleEngine";
import type {
  AlgorithmProfile,
  BenchmarkDataset,
  EvaluationResult,
  PenaltyBreakdown,
  SchedulerAlgorithm,
} from "../types";

const defaultSimulationOptions = {
  baseSeed: 20260725,
  runsPerVariant: 2,
  iterationsPerRun: 25,
};

type SimulationRequest = {
  datasetId: string;
  runCounter: number;
};

export function GeneratorEvaluationPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState(benchmarkDatasets[0].id);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<SchedulerAlgorithm>("annealing");
  const [simulationRequest, setSimulationRequest] = useState<SimulationRequest>({
    datasetId: benchmarkDatasets[0].id,
    runCounter: 1,
  });
  const [datasetJson, setDatasetJson] = useState("");
  const [datasetValidation, setDatasetValidation] = useState<DatasetInputValidation | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const customDataset = datasetValidation?.status === "valid" ? datasetValidation.dataset : null;
  const datasets = useMemo(
    () => (customDataset ? [customDataset, ...benchmarkDatasets] : benchmarkDatasets),
    [customDataset],
  );
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) ?? datasets[0];
  const simulationDataset =
    datasets.find((dataset) => dataset.id === simulationRequest.datasetId) ?? benchmarkDatasets[0];
  const hasPendingDataset = selectedDataset.id !== simulationDataset.id;
  const simulation = useMemo(
    () =>
      runScheduleSimulation([simulationDataset], {
        ...defaultSimulationOptions,
        baseSeed: defaultSimulationOptions.baseSeed + simulationRequest.runCounter * 101,
      }),
    [simulationDataset, simulationRequest.runCounter],
  );
  const currentResult = getResult(simulation.results, simulationDataset.id, "current", selectedAlgorithmId);
  const candidateResult = getResult(simulation.results, simulationDataset.id, "candidate", selectedAlgorithmId);
  const penaltyBreakdowns =
    simulation.breakdownsByDatasetAndAlgorithm[keyForDatasetAndAlgorithm(simulationDataset.id, selectedAlgorithmId)] ??
    [];
  const validationGates = simulation.validationGatesByAlgorithm[selectedAlgorithmId] ?? simulation.validationGates;

  const summary = useMemo(
    () => ({
      totalPenaltyDelta: candidateResult.meanTotalPenalty - currentResult.meanTotalPenalty,
      threeNightReduction:
        ((currentResult.meanThreeNightBlocks - candidateResult.meanThreeNightBlocks) /
          Math.max(currentResult.meanThreeNightBlocks, 1)) *
        100,
      zeroNightLift: candidateResult.zeroThreeNightRate - currentResult.zeroThreeNightRate,
      runtimeDelta: candidateResult.meanRuntimeMinutes - currentResult.meanRuntimeMinutes,
    }),
    [candidateResult, currentResult],
  );

  function handleValidateDataset() {
    const validation = validateScheduleExportJson(datasetJson);
    setDatasetValidation(validation);

    if (validation.status === "valid") {
      setSelectedDatasetId(validation.dataset.id);
    }
  }

  function handleLoadSample() {
    setDatasetJson(sampleScheduleExportJson);
    setDatasetValidation(null);
  }

  function handleClearDataset() {
    setDatasetJson("");
    setDatasetValidation(null);

    if (customDataset && selectedDatasetId === customDataset.id) {
      setSelectedDatasetId(benchmarkDatasets[0].id);
    }
  }

  function handleRunSimulation() {
    setIsRunning(true);
    window.setTimeout(() => {
      setSimulationRequest((currentRequest) => ({
        datasetId: selectedDataset.id,
        runCounter: currentRequest.runCounter + 1,
      }));
      window.setTimeout(() => setIsRunning(false), 180);
    }, 250);
  }

  return (
    <section className="page generator-page">
      <header className="page-header">
        <div>
          <Badge tone="info">Task 2</Badge>
          <h1>Generator Evaluation</h1>
          <p>Validation plan for adding a penalty against three consecutive night shifts.</p>
        </div>
        <div className="header-actions">
          <button className="button button-primary" disabled={isRunning} onClick={handleRunSimulation} type="button">
            {isRunning ? <Loader2 aria-hidden="true" className="spin-icon" size={17} /> : <Play aria-hidden="true" size={17} />}
            {isRunning ? "Running..." : hasPendingDataset ? "Run selected dataset" : "Run simulation"}
          </button>
          <ContextHelpButton topicId="generator-evaluation" />
        </div>
      </header>

      <div className="generator-metric-grid">
        <GeneratorMetric
          icon={<Database aria-hidden="true" size={18} />}
          label="Benchmark datasets"
          value={datasets.length.toString()}
          detail={customDataset ? "Including imported JSON" : "Fixed input snapshots"}
        />
        <GeneratorMetric
          icon={<FlaskConical aria-hidden="true" size={18} />}
          label="Runs per variant"
          value={currentResult.runs.toString()}
          detail={`${simulation.options.iterationsPerRun} iterations each`}
        />
        <GeneratorMetric
          icon={<Moon aria-hidden="true" size={18} />}
          label="Three-night reduction"
          value={`${Math.round(summary.threeNightReduction)}%`}
          detail="Mean block count"
        />
        <GeneratorMetric
          icon={<Timer aria-hidden="true" size={18} />}
          label="Runtime delta"
          value={`${formatSignedDecimal(summary.runtimeDelta * 60 * 1000)} ms`}
          detail="Mean browser runtime"
        />
        <GeneratorMetric
          icon={<BarChart3 aria-hidden="true" size={18} />}
          label="Generated at"
          value={formatTime(simulation.generatedAt)}
          detail={`Seed ${simulation.options.baseSeed}`}
        />
      </div>

      <div className="generator-layout">
        <div className="generator-side-stack">
          <DatasetImportPanel
            datasetJson={datasetJson}
            validation={datasetValidation}
            onChangeDatasetJson={(value) => {
              setDatasetJson(value);
              setDatasetValidation(null);
            }}
            onClearDataset={handleClearDataset}
            onLoadSample={handleLoadSample}
            onValidateDataset={handleValidateDataset}
          />
          <BenchmarkSelector
            datasets={datasets}
            selectedDatasetId={selectedDataset.id}
            onSelectDataset={setSelectedDatasetId}
          />
          <AlgorithmSelector
            algorithms={algorithmProfiles}
            selectedAlgorithmId={selectedAlgorithmId}
            onSelectAlgorithm={setSelectedAlgorithmId}
          />
        </div>

        <div className="detail-stack">
          <EvaluationComparison
            candidateResult={candidateResult}
            currentResult={currentResult}
            dataset={simulationDataset}
            hasPendingDataset={hasPendingDataset}
            pendingDataset={hasPendingDataset ? selectedDataset : null}
            totalPenaltyDelta={summary.totalPenaltyDelta}
            zeroNightLift={summary.zeroNightLift}
          />

          <AlgorithmComparisonPanel
            dataset={simulationDataset}
            results={simulation.results}
            selectedAlgorithmId={selectedAlgorithmId}
          />

          <PenaltyBreakdownPanel breakdowns={penaltyBreakdowns} />

          <ValidationMethodologyPanel gates={validationGates} />
          <EngineNotesPanel />
        </div>
      </div>
    </section>
  );
}

function DatasetImportPanel({
  datasetJson,
  validation,
  onChangeDatasetJson,
  onClearDataset,
  onLoadSample,
  onValidateDataset,
}: {
  datasetJson: string;
  validation: DatasetInputValidation | null;
  onChangeDatasetJson: (value: string) => void;
  onClearDataset: () => void;
  onLoadSample: () => void;
  onValidateDataset: () => void;
}) {
  const hasInput = datasetJson.trim().length > 0;

  return (
    <aside className="account-directory generator-selector dataset-import-panel" aria-label="Dataset JSON import">
      <div className="panel-heading">
        <div>
          <h2>Dataset Input</h2>
          <span>Paste exported scheduling JSON</span>
        </div>
        <div className="panel-heading-actions">
          <FileJson aria-hidden="true" className="panel-title-icon" size={20} />
          <ContextHelpButton topicId="generator-dataset-input" />
        </div>
      </div>

      <label className="field-stack">
        <span>Export JSON</span>
        <textarea
          className="dataset-textarea"
          onChange={(event) => onChangeDatasetJson(event.target.value)}
          placeholder='{"accountName":"Motol ICU","department":"JIP","workers":[...],"requirements":[...]}'
          spellCheck={false}
          value={datasetJson}
        />
      </label>

      <div className="dataset-input-actions">
        <button className="button button-primary" disabled={!hasInput} onClick={onValidateDataset} type="button">
          <ClipboardCheck aria-hidden="true" size={16} />
          Validate
        </button>
        <button className="button button-secondary" onClick={onLoadSample} type="button">
          Load sample
        </button>
        <button className="button button-secondary" disabled={!hasInput && !validation} onClick={onClearDataset} type="button">
          Clear
        </button>
      </div>

      {validation ? <DatasetValidationResult validation={validation} /> : null}
    </aside>
  );
}

function DatasetValidationResult({ validation }: { validation: DatasetInputValidation }) {
  if (validation.status === "invalid") {
    return (
      <div className="dataset-validation dataset-validation-error" role="status">
        <div>
          <AlertCircle aria-hidden="true" size={18} />
          <strong>Validation failed</strong>
        </div>
        <ul>
          {validation.issues.slice(0, 4).map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="dataset-validation dataset-validation-success" role="status">
      <div>
        <CheckCircle2 aria-hidden="true" size={18} />
        <strong>Ready for algorithm run</strong>
      </div>
      <DatasetSummary summary={validation.summary} />
    </div>
  );
}

function DatasetSummary({ summary }: { summary: DatasetInputSummary }) {
  return (
    <div className="dataset-summary-grid">
      <div>
        <span>Workers</span>
        <strong>{summary.staffCount}</strong>
      </div>
      <div>
        <span>Days</span>
        <strong>{summary.horizonDays}</strong>
      </div>
      <div>
        <span>Shifts</span>
        <strong>{summary.totalRequiredShifts}</strong>
      </div>
      <div>
        <span>Nights</span>
        <strong>{summary.totalNightShifts}</strong>
      </div>
      <div>
        <span>Absences</span>
        <strong>{summary.unavailableEntries}</strong>
      </div>
      <div>
        <span>Prefs</span>
        <strong>{summary.preferenceEntries}</strong>
      </div>
    </div>
  );
}

function AlgorithmSelector({
  algorithms,
  selectedAlgorithmId,
  onSelectAlgorithm,
}: {
  algorithms: AlgorithmProfile[];
  selectedAlgorithmId: SchedulerAlgorithm;
  onSelectAlgorithm: (algorithmId: SchedulerAlgorithm) => void;
}) {
  return (
    <aside className="account-directory generator-selector" aria-label="Scheduler algorithms">
      <div className="panel-heading">
        <div>
          <h2>Algorithms</h2>
          <span>{algorithms.length} strategies</span>
        </div>
        <ContextHelpButton topicId="generator-algorithms" />
      </div>

      <div className="benchmark-list">
        {algorithms.map((algorithm) => (
          <button
            className={`benchmark-item${selectedAlgorithmId === algorithm.id ? " is-selected" : ""}`}
            key={algorithm.id}
            onClick={() => onSelectAlgorithm(algorithm.id)}
            type="button"
          >
            <div>
              <strong>{algorithm.name}</strong>
              <span>{algorithm.bestFor}</span>
            </div>
            <Badge tone={algorithm.id === "annealing" ? "warning" : "info"}>{algorithm.id}</Badge>
          </button>
        ))}
      </div>
    </aside>
  );
}

function BenchmarkSelector({
  datasets,
  selectedDatasetId,
  onSelectDataset,
}: {
  datasets: BenchmarkDataset[];
  selectedDatasetId: string;
  onSelectDataset: (datasetId: string) => void;
}) {
  return (
    <aside className="account-directory generator-selector" aria-label="Benchmark datasets">
      <div className="panel-heading">
        <div>
          <h2>Benchmarks</h2>
          <span>{datasets.length} datasets</span>
        </div>
        <ContextHelpButton topicId="generator-benchmarks" />
      </div>

      <div className="benchmark-list">
        {datasets.map((dataset) => (
          <button
            className={`benchmark-item${selectedDatasetId === dataset.id ? " is-selected" : ""}`}
            key={dataset.id}
            onClick={() => onSelectDataset(dataset.id)}
            type="button"
          >
            <div>
              <strong>{dataset.name}</strong>
              <span>{dataset.department}</span>
            </div>
            <div className="benchmark-badges">
              <Badge tone={dataset.source === "imported" ? "success" : "info"}>{dataset.source}</Badge>
              <Badge tone={dataset.riskProfile === "stress" ? "warning" : "info"}>
                {dataset.riskProfile}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function EvaluationComparison({
  dataset,
  currentResult,
  candidateResult,
  hasPendingDataset,
  pendingDataset,
  totalPenaltyDelta,
  zeroNightLift,
}: {
  dataset: BenchmarkDataset;
  currentResult: EvaluationResult;
  candidateResult: EvaluationResult;
  hasPendingDataset: boolean;
  pendingDataset: BenchmarkDataset | null;
  totalPenaltyDelta: number;
  zeroNightLift: number;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Old vs New Algorithm</h2>
          <span>{dataset.description}</span>
        </div>
        <div className="panel-heading-actions">
          <Badge tone={totalPenaltyDelta <= 0 ? "success" : "warning"}>
            {hasPendingDataset ? "Pending run" : totalPenaltyDelta <= 0 ? "Improved" : "Review"}
          </Badge>
          <ContextHelpButton topicId="generator-old-vs-new" />
        </div>
      </div>

      {pendingDataset ? (
        <div className="pending-run-banner">
          <strong>{pendingDataset.name}</strong>
          <span>Validated and selected. Run the simulation to replace the current comparison results.</span>
        </div>
      ) : null}

      <div className="comparison-grid">
        <ResultColumn label="Current" result={currentResult} tone="neutral" />
        <ResultColumn label="Candidate" result={candidateResult} tone="success" />
        <div className="decision-panel">
          <Gauge aria-hidden="true" size={20} />
          <span>Decision signal</span>
          <strong>{formatSigned(totalPenaltyDelta)} total penalty</strong>
          <small>{formatPercent(zeroNightLift)} more runs with zero three-night blocks</small>
        </div>
      </div>
    </section>
  );
}

function AlgorithmComparisonPanel({
  dataset,
  results,
  selectedAlgorithmId,
}: {
  dataset: BenchmarkDataset;
  results: EvaluationResult[];
  selectedAlgorithmId: SchedulerAlgorithm;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Algorithm Comparison</h2>
          <span>Candidate variant across different scheduler strategies</span>
        </div>
        <ContextHelpButton topicId="generator-algorithm-comparison" />
      </div>

      <div className="algorithm-comparison-grid">
        {algorithmProfiles.map((algorithm) => {
          const current = getResult(results, dataset.id, "current", algorithm.id);
          const candidate = getResult(results, dataset.id, "candidate", algorithm.id);
          const delta = candidate.meanTotalPenalty - current.meanTotalPenalty;

          return (
            <article
              className={`algorithm-card${selectedAlgorithmId === algorithm.id ? " is-selected" : ""}`}
              key={algorithm.id}
            >
              <div>
                <Badge tone={selectedAlgorithmId === algorithm.id ? "success" : "info"}>
                  {algorithm.id}
                </Badge>
                <h3>{algorithm.name}</h3>
                <p>{algorithm.approach}</p>
              </div>
              <div className="algorithm-facts">
                <div>
                  <span>Penalty delta</span>
                  <strong>{formatSigned(delta)}</strong>
                </div>
                <div>
                  <span>3-night blocks</span>
                  <strong>{candidate.meanThreeNightBlocks.toFixed(1)}</strong>
                </div>
                <div>
                  <span>Runtime</span>
                  <strong>{formatSignedDecimal(candidate.meanRuntimeMinutes * 1000 * 60)} ms</strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ResultColumn({
  label,
  result,
  tone,
}: {
  label: string;
  result: EvaluationResult;
  tone: "neutral" | "success";
}) {
  return (
    <article className={`result-column result-column-${tone}`}>
      <span>{label}</span>
      <strong>{formatNumber(result.meanTotalPenalty)}</strong>
      <small>mean total penalty</small>

      <div className="result-facts">
        <div>
          <span>Median</span>
          <strong>{formatNumber(result.medianTotalPenalty)}</strong>
        </div>
        <div>
          <span>P95</span>
          <strong>{formatNumber(result.p95TotalPenalty)}</strong>
        </div>
        <div>
          <span>3-night blocks</span>
          <strong>{result.meanThreeNightBlocks.toFixed(1)}</strong>
        </div>
        <div>
          <span>Zero-block runs</span>
          <strong>{formatPercent(result.zeroThreeNightRate)}</strong>
        </div>
      </div>
    </article>
  );
}

function PenaltyBreakdownPanel({ breakdowns }: { breakdowns: PenaltyBreakdown[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Penalty Breakdown</h2>
          <span>Mean penalty components across repeated runs</span>
        </div>
        <ContextHelpButton topicId="generator-penalty-breakdown" />
      </div>

      <div className="penalty-list">
        {breakdowns.map((item) => {
          const delta = item.candidateMean - item.currentMean;
          const regressionPercent =
            item.currentMean === 0 ? 0 : (Math.max(delta, 0) / item.currentMean) * 100;
          const status = item.area === "New rule" || regressionPercent <= item.maxRegressionPercent ? "ok" : "watch";

          return (
            <article className="penalty-row" key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <small>{item.area}</small>
              </div>
              <div className="penalty-values">
                <span>{formatNumber(item.currentMean)}</span>
                <span>{formatNumber(item.candidateMean)}</span>
                <Badge tone={status === "ok" ? "success" : "warning"}>{formatSigned(delta)}</Badge>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ValidationMethodologyPanel({ gates }: { gates: ScheduleSimulation["validationGates"] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Validation Methodology</h2>
          <span>How we prove the change helped and did not break existing behavior</span>
        </div>
        <ContextHelpButton topicId="generator-validation-methodology" />
      </div>

      <div className="method-grid">
        {gates.map((gate) => (
          <article className="method-card" key={gate.id}>
            <Badge tone={gate.status === "passed" ? "success" : gate.status === "watch" ? "warning" : "danger"}>
              {gate.status}
            </Badge>
            <h3>{gate.title}</h3>
            <p>{gate.evidence}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EngineNotesPanel() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Implemented Algorithm Model</h2>
          <span>Browser-local substitute for the production five-minute optimizer</span>
        </div>
        <ContextHelpButton topicId="generator-engine-model" />
      </div>

      <div className="method-grid method-grid-compact">
        {algorithmProfiles.map((algorithm) => (
          <article className="method-card" key={algorithm.id}>
            <Badge tone={algorithm.id === "annealing" ? "warning" : "info"}>{algorithm.id}</Badge>
            <h3>{algorithm.name}</h3>
            <p>{algorithm.complexity}</p>
            <small>{algorithm.memory}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function GeneratorMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function getResult(
  results: EvaluationResult[],
  datasetId: string,
  variant: "current" | "candidate",
  algorithm: SchedulerAlgorithm,
) {
  const result = results.find(
    (item) => item.datasetId === datasetId && item.variant === variant && item.algorithm === algorithm,
  );

  if (!result) {
    throw new Error(`Missing ${variant} evaluation result for ${datasetId}`);
  }

  return result;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function formatSigned(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US")}`;
}

function formatSignedDecimal(value: number) {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US")}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
