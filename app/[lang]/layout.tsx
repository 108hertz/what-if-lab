import "../globals.css";
import { notFound } from "next/navigation";
import RootShell, { ROOT_METADATA, ROOT_VIEWPORT } from "@/components/shell/RootShell";
import { isLocale, langParams, DEFAULT_LOCALE } from "@/lib/i18n";

/** Root layout for every language but English: /<code>/… (ADR 0010). Metadata per language comes in step 3. */
export const metadata = ROOT_METADATA;
export const viewport = ROOT_VIEWPORT;
export const dynamicParams = false;

export function generateStaticParams() {
  return langParams();
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang) || lang === DEFAULT_LOCALE) notFound();
  return <RootShell locale={lang}>{children}</RootShell>;
}
