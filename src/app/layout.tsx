import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Space_Grotesk({ variable: "--font-sans-face", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Sponsor Radar", template: "%s · Sponsor Radar" },
  description: "Frontend and fullstack roles at companies with a record of sponsoring H-1B visas, built on public U.S. Department of Labor data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} min-h-dvh antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b border-line bg-surface/80 backdrop-blur">
          <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent font-mono text-xs text-accent-ink">SR</span>
              Sponsor Radar
            </Link>
            <div className="ml-auto flex items-center gap-4 text-sm text-muted sm:gap-5">
              <Link href="/" className="hover:text-ink">Jobs</Link>
              <Link href="/sponsors" className="hover:text-ink">Sponsor search</Link>
              <a href="/api/graphql" className="hover:text-ink">API</a>
              <a href="https://github.com/abhijeetpalanki/sponsor-radar" className="hover:text-ink">GitHub</a>
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-line py-8 text-center text-sm text-muted">
          <p className="mx-auto max-w-3xl px-4">
            Data: U.S. Department of Labor H-1B disclosure files and public Greenhouse, Ashby and Lever job boards. A filing shows an
            employer&apos;s intent to sponsor, not a guarantee. Built by{" "}
            <a className="underline hover:text-ink" href="https://abhijeetpalanki.netlify.app">Abhijeet Palanki</a>.
          </p>
        </footer>
      </body>
    </html>
  );
}
