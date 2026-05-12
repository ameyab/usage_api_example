import { getMonthlyInvoices } from "@/lib/usage-api";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const monthInput = Number(params.months ?? 6);
  const months = Number.isFinite(monthInput) ? Math.max(1, Math.min(12, monthInput)) : 6;
  let invoices: Awaited<ReturnType<typeof getMonthlyInvoices>> = [];
  let loadError: string | null = null;

  try {
    invoices = await getMonthlyInvoices(months);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  const grandTotal = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const isAuthError = (loadError ?? "").includes("401");

  return (
    <main className="container">
      <h1>Usage Chargeback</h1>
      <p className="muted">Monthly project chargeback (pricing: $3/GB + $0.0015 per score).</p>

      <form className="controls" method="get">
        <label htmlFor="months">Months</label>
        <input id="months" name="months" type="number" min={1} max={12} defaultValue={months} />
        <button type="submit">Refresh</button>
      </form>

      {loadError ? (
        <>
          <p className="muted">Unable to load usage data.</p>
          <pre className="error">{loadError}</pre>
          {isAuthError ? (
            <p className="muted">
              Check <code>BRAINTRUST_API_KEY</code> and <code>ORG_ID</code> in{" "}
              <code>web/.env.local</code>, then restart <code>npm run dev</code>.
            </p>
          ) : (
            <p className="muted">
              Set <code>BRAINTRUST_API_KEY</code> and <code>ORG_ID</code> in <code>web/.env.local</code>.
            </p>
          )}
        </>
      ) : (
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
                      <tr key={`${invoice.monthStart}-${project.projectId}`}>
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
        </>
      )}
    </main>
  );
}
