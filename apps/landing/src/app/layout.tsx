import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap"
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mailmind.app"),
  title: "MailMind — AI drafts in your voice, inside Gmail",
  description:
    "MailMind helps you reply faster with persona-aware AI drafts, a Gmail extension, and a focused desktop inbox—powered by a local FastAPI service you control.",
  openGraph: {
    title: "MailMind",
    description: "Email for people who ship. Persona-aware AI drafts in Gmail and a desktop inbox.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased text-foreground bg-background">{children}</body>
    </html>
  );
}
