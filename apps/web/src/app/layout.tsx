import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Caveat, Fraunces } from "next/font/google";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale } from "@/i18n/server";
import { SettingsProvider } from "@/preferences/SettingsProvider";
import { TEXT_SIZE_SCRIPT } from "@/preferences/preferences";
import "./globals.css";

// Self-hosted at build time: visitors never contact Google.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

/**
 * Where this instance lives, so the picture shown when its link is shared gets an absolute address. The official
 * instance is the default; a copy run elsewhere sets `NEXT_PUBLIC_SITE_URL` when it builds.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://app.lafogata.workers.dev";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { meta } = DICTIONARIES[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: meta.description,
    openGraph: {
      type: "website",
      siteName: meta.title,
      title: meta.title,
      description: meta.description,
      locale: locale === "es" ? "es_ES" : "en_US",
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      // The text-size script below sets data-text-size before React sees the page.
      suppressHydrationWarning
      className={`${fraunces.variable} ${atkinson.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="font-ui flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
        <I18nProvider initialLocale={locale}>
          <SettingsProvider>{children}</SettingsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
