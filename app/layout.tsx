import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Agent Evals",
  description: "Synthetic AI support-agent evaluation dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
