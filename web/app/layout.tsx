import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Usage Chargeback",
  description: "Monthly project invoices based on usage API data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
