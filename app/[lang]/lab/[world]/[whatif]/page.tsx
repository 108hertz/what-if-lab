import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WhatIfPage, { whatifMeta } from "@/components/pages/WhatIfPage";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { WHATIF_PAGE_LOCALES, findWhatIf, whatifPages } from "@/lib/seo/whatifPages";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS, isSandboxKey } from "@/worlds/registry";

/** A what-if's own page in the other languages (change 0033, step 7): /<lang>/lab/<world>/<slug>, the English slug. */
export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { lang: string } }) {
  if (params.lang === DEFAULT_LOCALE || !WHATIF_PAGE_LOCALES.includes(params.lang)) return [];
  return SANDBOX_KEYS.flatMap((world) => whatifPages(SANDBOXES[world]).map((x) => ({ world, whatif: x.slug })));
}

type Props = { params: Promise<{ lang: string; world: string; whatif: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, world, whatif } = await params;
  return isSandboxKey(world) && WHATIF_PAGE_LOCALES.includes(lang) ? whatifMeta(lang, world, whatif) : {};
}

export default async function Page({ params }: Props) {
  const { lang, world, whatif } = await params;
  if (!isSandboxKey(world) || !WHATIF_PAGE_LOCALES.includes(lang) || !findWhatIf(SANDBOXES[world], whatif)) notFound();
  return <WhatIfPage locale={lang} world={world} slug={whatif} />;
}
