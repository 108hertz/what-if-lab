"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { galaxy } from "./sim";

/** The galaxy world's console. Starts from the standard layout; diverges in its own change. */
export default function GalaxyConsole() {
  const [engine, rerender] = useWorldEngine(galaxy);
  return <StandardConsole engine={engine} onChange={rerender} />;
}
