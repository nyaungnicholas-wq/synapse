import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision readers.
// Bundled (SIL Open Font License) so builds never depend on reaching a font CDN.
const atkinson = localFont({
  src: "./fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-atkinson",
  display: "swap",
});
const fraunces = localFont({
  src: "./fonts/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SYNAPSE — Closer, one conversation at a time", template: "%s · SYNAPSE" },
  description:
    "SYNAPSE gives grandparents, parents and the young people in their lives simple, guided ways to talk, share stories and do things together.",
};

export const viewport: Viewport = { themeColor: "#fbf7f0" };

const TEXT_SIZE_CLASS = { STANDARD: "", LARGE: "text-size-large", EXTRA_LARGE: "text-size-extra-large" } as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const sizeClass = TEXT_SIZE_CLASS[user?.profile?.textSize ?? "STANDARD"];
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${atkinson.variable} ${fraunces.variable} ${sizeClass}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
