import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Caveat, Fraunces } from "next/font/google";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale } from "@/i18n/server";
import "./globals.css";

// Self-hosted at build time: visitors never contact Google.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = DICTIONARIES[await getLocale()];
  return { title: meta.title, description: meta.description };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${atkinson.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="font-ui flex min-h-full flex-col">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
