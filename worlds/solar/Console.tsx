"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { solar } from "./sim";
import { throwPlanet } from "./interaction";

/** The solar world's console. Starts from the standard layout; diverges in its own change. */
export default function SolarConsole() {
  const [engine, rerender] = useWorldEngine(solar);
  return <StandardConsole engine={engine} onChange={rerender} interaction={throwPlanet} />;
}
