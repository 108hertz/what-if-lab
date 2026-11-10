import LabPage from "@/components/shell/LabPage";
import { pageMeta } from "@/components/shell/pageCopy";
import { HOME_MODE } from "@/worlds/registry";

export const metadata = pageMeta("en", HOME_MODE);

export default function Home() {
  return <LabPage locale="en" mode={HOME_MODE} />;
}
