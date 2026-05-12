"use client";

import { useMemo, useState } from "react";
import type { MonthlyInvoice, ProjectUsage } from "@/lib/usage-api";

const PRICE_PER_GB_USD = 3;
const PRICE_PER_SCORE_USD = 0.0015;

type Props = {
  invoices: MonthlyInvoice[];
  months: number;
};

type MonthMetrics = {
  llmCostUsd: number;
  avgLatencyMs: number | null;
  avgTtftMs: number | null;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  llmSpanCount: number;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function pickMetric(project: ProjectUsage, keys: string[]): number | null {
  for (const key of keys) {
    const value = project.extraMetrics[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return null;
}

export default function InvoiceTable({ invoices, months }: Props) {
  const grandTotal = useMemo(() => invoices.reduce((sum, invoice) => sum + invoice.total, 0), [invoices]);
  const [selected, setSelected] = useState<{ invoice: MonthlyInvoice; project: ProjectUsage } | null>(null);
  const [monthMetrics, setMonthMetrics] = useState<MonthMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  async function loadProjectMonthMetrics(invoice: MonthlyInvoice, project: ProjectUsage) {
    setSelected({ invoice, project });
    setMetricsError(null);
    setMonthMetrics(null);
    setMetricsLoading(true);

    try {
      const response = await fetch("/api/project-month-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.projectId,
          monthStart: invoice.monthStart,
          monthEnd: invoice.monthEnd,
        }),
      });

      const json = (await response.json()) as MonthMetrics & { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to load monthly project metrics");
      }
      setMonthMetrics(json);
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : "Unable to load monthly project metrics");
    } finally {
      setMetricsLoading(false);
    }
  }

  return (
    <>
      <p className="total">Total invoice ({months} months): {formatUsd(grandTotal)}</p>
      {invoices.map((invoice) => (
        <section className="card" key={invoice.monthStart}>
          <div className="row">
            <h2>{invoice.monthLabel}</h2>
            <strong>{formatUsd(invoice.total)}</strong>
          </div>

          {invoice.projects.length === 0 ? (
            <p className="muted">No usage</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>GB</th>
                  <th>Scorer Volume</th>
                  <th>Span Volume</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoice.projects.map((project) => (
                  <tr
                    className="project-row"
                    key={`${invoice.monthStart}-${project.projectId}`}
                    onClick={() => {
                      void loadProjectMonthMetrics(invoice, project);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void loadProjectMonthMetrics(invoice, project);
                      }
                    }}
                  >
                    <td>
                      <div>{project.projectName}</div>
                      <div className="muted-id">{project.projectId}</div>
                    </td>
                    <td>{project.usageGb.toFixed(3)}</td>
                    <td>{formatCount(project.scoreCount)}</td>
                    <td>{formatCount(project.spanCount)}</td>
                    <td>{formatUsd(project.invoiceUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {selected ? (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelected(null);
            setMonthMetrics(null);
            setMetricsError(null);
          }}
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Project invoice details"
          >
            <div className="row">
              <h2>Project Invoice</h2>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setMonthMetrics(null);
                  setMetricsError(null);
                }}
              >
                Close
              </button>
            </div>

            <p className="muted">{selected.invoice.monthLabel}</p>
            <p><strong>{selected.project.projectName}</strong></p>
            <p className="muted-id">{selected.project.projectId}</p>

            <div className="modal-section">
              <h3>Invoice Breakdown</h3>
              <p>GB charge ({selected.project.usageGb.toFixed(3)} x ${PRICE_PER_GB_USD}/GB): {formatUsd(selected.project.usageGb * PRICE_PER_GB_USD)}</p>
              <p>Scorer charge ({formatCount(selected.project.scoreCount)} x ${PRICE_PER_SCORE_USD}/score): {formatUsd(selected.project.scoreCount * PRICE_PER_SCORE_USD)}</p>
              <p><strong>Total: {formatUsd(selected.project.invoiceUsd)}</strong></p>
            </div>

            <div className="modal-section">
              <h3>Usage Details</h3>
              <p>Data GB: {selected.project.usageGb.toFixed(3)}</p>
              <p>Scorer volume: {formatCount(selected.project.scoreCount)}</p>
              <p>Span volume: {formatCount(selected.project.spanCount)}</p>
              {metricsLoading ? <p>Loading monthly LLM metrics...</p> : null}
              {metricsError ? <p className="muted">Could not load monthly LLM metrics: {metricsError}</p> : null}
              <p>
                LLM cost:{" "}
                {monthMetrics
                  ? formatUsd(monthMetrics.llmCostUsd)
                  : (() => {
                      const value = pickMetric(selected.project, ["llmCost", "llm_cost", "modelCost", "cost"]);
                      return value === null ? "N/A" : formatUsd(value);
                    })()}
              </p>
              <p>
                Average latency:{" "}
                {monthMetrics
                  ? monthMetrics.avgLatencyMs === null
                    ? "N/A"
                    : `${monthMetrics.avgLatencyMs.toFixed(2)} ms`
                  : (() => {
                      const value = pickMetric(selected.project, ["avgLatencyMs", "latencyMs", "avgLatency"]);
                      return value === null ? "N/A" : `${value.toFixed(2)} ms`;
                    })()}
              </p>
              <p>
                Tokens:{" "}
                {monthMetrics
                  ? formatCount(monthMetrics.totalTokens)
                  : (() => {
                      const value = pickMetric(selected.project, ["totalTokens", "tokenCount", "tokens"]);
                      return value === null ? "N/A" : formatCount(value);
                    })()}
              </p>
              <p>
                Prompt tokens: {monthMetrics ? formatCount(monthMetrics.promptTokens) : "N/A"}
              </p>
              <p>
                Completion tokens: {monthMetrics ? formatCount(monthMetrics.completionTokens) : "N/A"}
              </p>
              <p>
                LLM spans: {monthMetrics ? formatCount(monthMetrics.llmSpanCount) : "N/A"}
              </p>
              <p>
                Average TTFT:{" "}
                {monthMetrics
                  ? monthMetrics.avgTtftMs === null
                    ? "N/A"
                    : `${monthMetrics.avgTtftMs.toFixed(2)} ms`
                  : (() => {
                      const value = pickMetric(selected.project, ["avgTtftMs", "ttftMs", "avgTtft"]);
                      return value === null ? "N/A" : `${value.toFixed(2)} ms`;
                    })()}
              </p>
            </div>

            <div className="modal-section">
              <h3>Project Metadata</h3>
              <p>Created: {formatDate(selected.project.projectCreatedAt)}</p>
              <p>Deleted: {formatDate(selected.project.projectDeletedAt)}</p>
              <p>Org ID: {selected.project.projectOrgId ?? "N/A"}</p>
              <p>User ID: {selected.project.projectUserId ?? "N/A"}</p>
              <p>Description: {selected.project.projectDescription ?? "N/A"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
