import "../globals.css";
import RootShell, { ROOT_METADATA, ROOT_VIEWPORT } from "@/components/shell/RootShell";

/** English root layout: today's URLs, unprefixed (ADR 0010). */
export const metadata = ROOT_METADATA;
export const viewport = ROOT_VIEWPORT;

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
