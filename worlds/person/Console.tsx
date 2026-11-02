"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { person } from "./sim";

/** The person world's console. Starts from the standard layout; diverges in its own change. */
export default function PersonConsole() {
  const [engine, rerender] = useWorldEngine(person);
  return <StandardConsole engine={engine} onChange={rerender} />;
}
