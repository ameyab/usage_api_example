## Usage Chargeback App

Minimal Next.js app that builds monthly project invoices from the Braintrust Usage API.

### 1) Configure environment variables

Copy `.env.local.example` to `.env.local` and set:

- `BRAINTRUST_API_KEY`
- `ORG_ID`

### 2) Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### How month aggregation works

The Usage API only supports a rolling `days` parameter.  
To estimate monthly usage, the app:

1. calls usage for `days = X` (older boundary),
2. calls usage for `days = Y` (newer boundary),
3. computes the month amount as `usage(X) - usage(Y)`.

This mirrors the workaround you requested (`X` and `X-30/31/28` style windows), but computes exact month boundaries in UTC for each displayed month.

### Notes

- UI is intentionally minimal.
- Font stack starts with Helvetica.
- Default range is 6 months (configurable in the page input).

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
