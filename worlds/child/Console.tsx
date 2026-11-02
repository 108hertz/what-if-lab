"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { child } from "./sim";

/** The child world's console. Starts from the standard layout; diverges in its own change. */
export default function ChildConsole() {
  const [engine, rerender] = useWorldEngine(child);
  return <StandardConsole engine={engine} onChange={rerender} />;
}
