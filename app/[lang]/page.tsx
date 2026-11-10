import type { Metadata } from "next";
import LabPage from "@/components/shell/LabPage";
import { pageMeta } from "@/components/shell/pageCopy";
import { HOME_MODE } from "@/worlds/registry";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return pageMeta((await params).lang, HOME_MODE);
}

export default async function LocaleHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LabPage locale={lang} mode={HOME_MODE} />;
}
