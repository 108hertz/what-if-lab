"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { animals } from "./sim";

/** The animals world's console. Starts from the standard layout; diverges in its own change. */
export default function AnimalsConsole() {
  const [engine, rerender] = useWorldEngine(animals);
  return <StandardConsole engine={engine} onChange={rerender} />;
}
