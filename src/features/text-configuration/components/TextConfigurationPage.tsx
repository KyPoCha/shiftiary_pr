import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  DatabaseZap,
  FileCheck2,
  GitCompareArrows,
  Loader2,
  Play,
  Save,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../../shared/components/Badge";
import { useAdminData } from "../../../shared/api/adminDataStore";
import { analyzeTextConfigurationWithApi } from "../../../shared/api/adminApiClient";
import { ContextHelpButton } from "../../help-center/components/ContextHelpButton";
import {
  analyzeTextConfiguration,
  textConfigurationExamples,
} from "../engine/textConfigurationEngine";
import type { AppliedConfigurationEvent, TextConfigAnalysis, TextConfigChange } from "../types";

const defaultPrompt = textConfigurationExamples[0];

export function TextConfigurationPage() {
  const { data, applyTextConfiguration } = useAdminData();
  const [input, setInput] = useState(defaultPrompt);
  const [analysis, setAnalysis] = useState<TextConfigAnalysis | null>(() =>
    analyzeTextConfiguration(defaultPrompt),
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(data.customers[0].id);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const blockingClarifications = analysis?.clarifications.filter((item) => item.blocking).length ?? 0;
  const selectedCustomer = data.customers.find((customer) => customer.id === selectedCustomerId) ?? data.customers[0];
  const appliedEvents = data.textConfigurationRuns.filter((event) => event.customerId === selectedCustomerId);
  const extractionLabel = analysis?.extractionSource === "llm" ? "LLM" : "Fallback";

  async function handleAnalyze() {
    setIsAnalyzing(true);
    try {
      const apiAnalysis = await analyzeTextConfigurationWithApi(input);
      setAnalysis(apiAnalysis ?? analyzeTextConfiguration(input));
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleApply() {
    if (!analysis?.canApply) {
      return;
    }

    applyTextConfiguration(analysis, selectedCustomerId, input);
  }

  return (
    <section className="page text-config-page">
      <header className="page-header">
        <div>
          <Badge tone="info">Bonus</Badge>
          <h1>Text Configuration</h1>
          <p>Convert natural-language account setup requests into validated configuration changes.</p>
        </div>
        <div className="header-actions">
          <button className="button button-primary" disabled={isAnalyzing} onClick={handleAnalyze} type="button">
            {isAnalyzing ? <Loader2 aria-hidden="true" className="spin-icon" size={17} /> : <Play aria-hidden="true" size={17} />}
            {isAnalyzing ? "Analyzing..." : "Analyze text"}
          </button>
          <ContextHelpButton topicId="text-configuration" />
        </div>
      </header>

      <div className="generator-metric-grid">
        <TextConfigMetric
          icon={<Sparkles aria-hidden="true" size={18} />}
          label="Extraction"
          value={analysis ? extractionLabel : "--"}
          detail={analysis?.extractionModel ?? (analysis?.fallbackReason ? "Deterministic fallback" : "Local parser")}
        />
        <TextConfigMetric
          icon={<Bot aria-hidden="true" size={18} />}
          label="Confidence"
          value={analysis ? `${Math.round(analysis.confidence * 100)}%` : "--"}
          detail="Validated intent"
        />
        <TextConfigMetric
          icon={<GitCompareArrows aria-hidden="true" size={18} />}
          label="Preview changes"
          value={(analysis?.changes.length ?? 0).toString()}
          detail="Not saved yet"
        />
        <TextConfigMetric
          icon={<AlertTriangle aria-hidden="true" size={18} />}
          label="Blocking questions"
          value={blockingClarifications.toString()}
          detail="Must resolve before apply"
        />
        <TextConfigMetric
          icon={<DatabaseZap aria-hidden="true" size={18} />}
          label="Applied batches"
          value={appliedEvents.length.toString()}
          detail="Persisted history"
        />
      </div>

      <div className="text-config-layout">
        <div className="detail-stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Configuration Text</h2>
                <span>Describe account setup or setting changes</span>
              </div>
              <ContextHelpButton topicId="text-configuration-input" />
            </div>

            <label className="field-stack">
              <span>Target customer</span>
              <select onChange={(event) => setSelectedCustomerId(event.target.value)} value={selectedCustomerId}>
                {data.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.contractTier})
                  </option>
                ))}
              </select>
            </label>

            <label className="field-stack">
              <span>Request</span>
              <textarea
                className="text-config-textarea"
                onChange={(event) => setInput(event.target.value)}
                value={input}
              />
            </label>

            <div className="sample-prompt-row">
              {textConfigurationExamples.map((example) => (
                <button
                  className="mini-action"
                  key={example}
                  onClick={() => {
                    setInput(example);
                    setAnalysis(analyzeTextConfiguration(example));
                  }}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </div>
          </section>

          <ExtractionPanel analysis={analysis} />
        </div>

        <div className="detail-stack">
          <PreviewPanel analysis={analysis} onApply={handleApply} />
          <ClarificationPanel analysis={analysis} />
          <AppliedHistoryPanel events={appliedEvents} selectedCustomerName={selectedCustomer.name} />
        </div>
      </div>
    </section>
  );
}

function ExtractionPanel({ analysis }: { analysis: TextConfigAnalysis | null }) {
  const sourceTone = analysis?.extractionSource === "llm" ? "success" : "warning";

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Structured Intent</h2>
          <span>{analysis?.extractionSource === "llm" ? "LLM output validated by code" : "Deterministic fallback validated by code"}</span>
        </div>
        <ContextHelpButton topicId="text-configuration-validation" />
      </div>

      {analysis ? (
        <div className="source-badge-row">
          <Badge tone={sourceTone}>{analysis.extractionSource === "llm" ? "LLM" : "Fallback"}</Badge>
          <Badge tone="info">{analysis.extractionModel ?? "local parser"}</Badge>
        </div>
      ) : null}

      <pre className="intent-preview">
        {JSON.stringify(analysis?.extractedIntent ?? null, null, 2)}
      </pre>

      {analysis?.fallbackReason ? (
        <div className="validation-message-list">
          <span>{analysis.fallbackReason}</span>
        </div>
      ) : null}
    </section>
  );
}

function PreviewPanel({
  analysis,
  onApply,
}: {
  analysis: TextConfigAnalysis | null;
  onApply: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Change Preview</h2>
          <span>Nothing is saved until this diff is approved</span>
        </div>
        <ContextHelpButton topicId="text-configuration-preview" />
      </div>

      <div className="change-list">
        {analysis?.changes.length ? (
          analysis.changes.map((change) => <ChangePreview change={change} key={change.id} />)
        ) : (
          <div className="empty-state">
            <Bot aria-hidden="true" size={24} />
            <strong>No changes detected</strong>
            <span>Analyze a supported request to preview account settings.</span>
          </div>
        )}
      </div>

      <div className="panel-actions">
        <button className="button button-primary" disabled={!analysis?.canApply} onClick={onApply} type="button">
          <Save aria-hidden="true" size={16} />
          Apply preview
        </button>
        {!analysis?.canApply ? <span className="apply-hint">Resolve validation issues before saving.</span> : null}
      </div>
    </section>
  );
}

function ChangePreview({ change }: { change: TextConfigChange }) {
  return (
    <article className="change-preview-card">
      <div>
        <Badge tone={change.risk === "high" ? "danger" : change.risk === "medium" ? "warning" : "success"}>
          {change.risk}
        </Badge>
        <Badge tone={change.source === "llm" ? "warning" : "info"}>{change.source}</Badge>
      </div>
      <h3>{change.title}</h3>
      <span>{change.target}</span>
      <div className="diff-row">
        <div>
          <small>Before</small>
          <strong>{change.before}</strong>
        </div>
        <div>
          <small>After</small>
          <strong>{change.after}</strong>
        </div>
      </div>
    </article>
  );
}

function ClarificationPanel({ analysis }: { analysis: TextConfigAnalysis | null }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Clarifications</h2>
          <span>Ambiguity blocks unsafe writes</span>
        </div>
        <ContextHelpButton topicId="text-configuration-ambiguity" />
      </div>

      <div className="clarification-list">
        {analysis?.clarifications.length ? (
          analysis.clarifications.map((clarification) => (
            <article className="clarification-card" key={clarification.id}>
              <Badge tone={clarification.blocking ? "danger" : "warning"}>
                {clarification.blocking ? "blocking" : "review"}
              </Badge>
              <h3>{clarification.question}</h3>
              <div className="clarification-options">
                {clarification.options.map((option) => (
                  <span key={option}>{option}</span>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state empty-state-success">
            <CheckCircle2 aria-hidden="true" size={24} />
            <strong>No blocking ambiguity</strong>
            <span>The preview can be applied after review.</span>
          </div>
        )}
      </div>

      {analysis?.validationMessages.length ? (
        <div className="validation-message-list">
          {analysis.validationMessages.map((message) => (
            <span key={message}>{message}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AppliedHistoryPanel({
  events,
  selectedCustomerName,
}: {
  events: AppliedConfigurationEvent[];
  selectedCustomerName: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Apply History</h2>
          <span>Saved text batches for {selectedCustomerName}</span>
        </div>
      </div>

      <div className="applied-event-list">
        {events.length ? (
          events.map((event) => (
            <article className="applied-event" key={event.id}>
              <FileCheck2 aria-hidden="true" size={18} />
              <div>
                <strong>{event.summary}</strong>
                <span>{formatDateTime(event.createdAt)}</span>
              </div>
              <Badge tone="success">{event.changeCount} saved</Badge>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <DatabaseZap aria-hidden="true" size={24} />
            <strong>No applied changes</strong>
            <span>Approved previews will appear here.</span>
          </div>
        )}
      </div>
    </section>
  );
}



function TextConfigMetric({
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
