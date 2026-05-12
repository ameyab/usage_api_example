import { NextRequest, NextResponse } from "next/server";

const BTQL_URL = "https://api.braintrust.dev/btql";

type BtqlResponseRow = {
  llm_cost_usd: number | null;
  avg_latency_s: number | null;
  avg_ttft_s: number | null;
  total_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  llm_span_count: number | null;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim().replace(/^['"]|['"]$/g, "");
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isIsoDate(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function sanitizeRequiredNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sanitizeOptionalNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, monthStart, monthEnd } = (await request.json()) as {
      projectId?: string;
      monthStart?: string;
      monthEnd?: string;
    };

    if (!projectId || !monthStart || !monthEnd) {
      return NextResponse.json({ error: "projectId, monthStart, and monthEnd are required" }, { status: 400 });
    }

    if (!isIsoDate(monthStart) || !isIsoDate(monthEnd)) {
      return NextResponse.json({ error: "Invalid monthStart/monthEnd format" }, { status: 400 });
    }

    const apiKey = requireEnv("BRAINTRUST_API_KEY");
    const query = `
SELECT
  sum(estimated_cost()) AS llm_cost_usd,
  avg(metrics.latency) AS avg_latency_s,
  avg(metrics.time_to_first_token) AS avg_ttft_s,
  sum(coalesce(metrics.total_tokens, metrics.tokens, 0)) AS total_tokens,
  sum(coalesce(metrics.prompt_tokens, 0)) AS prompt_tokens,
  sum(coalesce(metrics.completion_tokens, 0)) AS completion_tokens,
  count(*) AS llm_span_count
FROM project_logs('${projectId}', shape => 'spans')
WHERE created >= '${monthStart}'
  AND created < '${monthEnd}'
  AND span_attributes.type = 'llm'
`.trim();

    const response = await fetch(BTQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `BTQL request failed: ${response.status} ${response.statusText}` }, { status: 502 });
    }

    const json = (await response.json()) as { data?: BtqlResponseRow[] };
    const row = json.data?.[0] ?? null;

    const avgLatencyS = sanitizeOptionalNumber(row?.avg_latency_s);
    const avgTtftS = sanitizeOptionalNumber(row?.avg_ttft_s);

    return NextResponse.json({
      llmCostUsd: sanitizeRequiredNumber(row?.llm_cost_usd),
      avgLatencyMs: avgLatencyS === null ? null : avgLatencyS * 1000,
      avgTtftMs: avgTtftS === null ? null : avgTtftS * 1000,
      totalTokens: sanitizeRequiredNumber(row?.total_tokens),
      promptTokens: sanitizeRequiredNumber(row?.prompt_tokens),
      completionTokens: sanitizeRequiredNumber(row?.completion_tokens),
      llmSpanCount: sanitizeRequiredNumber(row?.llm_span_count),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
