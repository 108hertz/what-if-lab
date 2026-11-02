import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Lab from "@/components/shell/LabClient";
import { WORLDS, SANDBOX_KEYS, isSandboxKey } from "@/worlds/registry";

export function generateStaticParams() {
  return SANDBOX_KEYS.map((world) => ({ world }));
}

export async function generateMetadata({ params }: { params: Promise<{ world: string }> }): Promise<Metadata> {
  const { world } = await params;
  return { title: isSandboxKey(world) ? `${WORLDS[world].name} · What-If Lab` : "What-If Lab" };
}

export default async function WorldPage({ params }: { params: Promise<{ world: string }> }) {
  const { world } = await params;
  if (!isSandboxKey(world)) notFound();
  return <Lab mode={world} />;
}
