import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WhatIfPage, { whatifMeta } from "@/components/pages/WhatIfPage";
import { findWhatIf, whatifPages } from "@/lib/seo/whatifPages";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS, isSandboxKey } from "@/worlds/registry";

/** A what-if's own page in English (change 0033, step 6): /lab/<world>/<slug>. */
export const dynamicParams = false;

export function generateStaticParams() {
  return SANDBOX_KEYS.flatMap((world) => whatifPages(SANDBOXES[world]).map((x) => ({ world, whatif: x.slug })));
}

type Props = { params: Promise<{ world: string; whatif: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { world, whatif } = await params;
  return isSandboxKey(world) ? whatifMeta("en", world, whatif) : {};
}

export default async function Page({ params }: Props) {
  const { world, whatif } = await params;
  if (!isSandboxKey(world) || !findWhatIf(SANDBOXES[world], whatif)) notFound();
  return <WhatIfPage locale="en" world={world} slug={whatif} />;
}
