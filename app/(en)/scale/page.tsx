import LabPage from "@/components/shell/LabPage";
import { pageMeta } from "@/components/shell/pageCopy";

export const metadata = pageMeta("en", "scale");

export default function ScalePage() {
  return <LabPage locale="en" mode="scale" />;
}
