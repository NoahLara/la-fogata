import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Caveat, Fraunces } from "next/font/google";
import "./globals.css";

// Self-hosted at build time: visitors never contact Google.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "La Fogata",
  description: "Una fogata para las noches difíciles",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${atkinson.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="font-ui flex min-h-full flex-col">{children}</body>
    </html>
  );
}
