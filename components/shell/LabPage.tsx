import { pageMessages } from "@/lib/i18n/load";
import type { Mode } from "@/worlds/registry";
import { I18nProvider } from "../i18n/I18nProvider";
import Lab from "./LabClient";
import PageIntro from "./PageIntro";
import BootScene from "./BootScene";
import Consent from "../privacy/ConsentBanner";

/**
 * One page of the lab in one language: the language's messages are read at build time and travel with the HTML.
 * PageIntro is the static, crawlable page (seen without scripts); BootScene covers the load with scripts on (change 0026).
 */
export default function LabPage({ locale, mode }: { locale: string; mode: Mode }) {
  const m = pageMessages(locale, mode === "scale" ? undefined : mode);
  return (
    <I18nProvider locale={m.locale} messages={m.messages}>
      <PageIntro locale={locale} mode={mode} />
      <BootScene locale={locale} mode={mode} />
      <Lab mode={mode} />
      <Consent />
    </I18nProvider>
  );
}
