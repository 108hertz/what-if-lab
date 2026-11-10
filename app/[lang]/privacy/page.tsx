import type { Metadata } from "next";
import DocPage, { docMeta } from "@/components/pages/DocPage";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return docMeta((await params).lang, "privacy");
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <DocPage locale={(await params).lang} kind="privacy" />;
}
