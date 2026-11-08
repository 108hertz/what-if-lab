import type { Metadata } from "next";
import LabPage from "@/components/shell/LabPage";
import { pageMeta } from "@/components/shell/pageCopy";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return pageMeta((await params).lang, "scale");
}

export default async function LocaleHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LabPage locale={lang} mode="scale" />;
}
