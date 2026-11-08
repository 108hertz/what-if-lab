import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LabPage from "@/components/shell/LabPage";
import { SANDBOX_KEYS, isSandboxKey } from "@/worlds/registry";
import { pageMeta } from "@/components/shell/pageCopy";

export const dynamicParams = false;

export function generateStaticParams() {
  return SANDBOX_KEYS.map((world) => ({ world }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; world: string }> }): Promise<Metadata> {
  const { lang, world } = await params;
  return isSandboxKey(world) ? pageMeta(lang, world) : {};
}

export default async function LocaleWorldPage({ params }: { params: Promise<{ lang: string; world: string }> }) {
  const { lang, world } = await params;
  if (!isSandboxKey(world)) notFound();
  return <LabPage locale={lang} mode={world} />;
}
