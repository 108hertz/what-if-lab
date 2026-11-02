"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { earth } from "./sim";

/** The earth world's console. Starts from the standard layout; diverges in its own change. */
export default function EarthConsole() {
  const [engine, rerender] = useWorldEngine(earth);
  return <StandardConsole engine={engine} onChange={rerender} />;
}
