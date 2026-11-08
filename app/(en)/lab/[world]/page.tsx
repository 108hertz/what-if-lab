import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LabPage from "@/components/shell/LabPage";
import { SANDBOX_KEYS, isSandboxKey } from "@/worlds/registry";
import { pageMeta } from "@/components/shell/pageCopy";

export function generateStaticParams() {
  return SANDBOX_KEYS.map((world) => ({ world }));
}

export async function generateMetadata({ params }: { params: Promise<{ world: string }> }): Promise<Metadata> {
  const { world } = await params;
  return isSandboxKey(world) ? pageMeta("en", world) : {};
}

export default async function WorldPage({ params }: { params: Promise<{ world: string }> }) {
  const { world } = await params;
  if (!isSandboxKey(world)) notFound();
  return <LabPage locale="en" mode={world} />;
}
