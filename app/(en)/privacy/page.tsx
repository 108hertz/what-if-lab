import DocPage, { docMeta } from "@/components/pages/DocPage";

export const metadata = docMeta("en", "privacy");

export default function Page() {
  return <DocPage locale="en" kind="privacy" />;
}
