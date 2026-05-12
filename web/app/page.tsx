import { getMonthlyInvoices } from "@/lib/usage-api";
import InvoiceTable from "@/app/components/invoice-table";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
        <InvoiceTable invoices={invoices} months={months} />
      )}
    </main>
  );
}
