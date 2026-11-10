import DocPage, { docMeta } from "@/components/pages/DocPage";

export const metadata = docMeta("en", "about");

export default function Page() {
  return <DocPage locale="en" kind="about" />;
}
