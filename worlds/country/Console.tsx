"use client";

import StandardConsole from "@/components/console/StandardConsole";
import { useWorldEngine } from "@/components/console/engines";
import { country } from "./sim";

/** The country world's console. Starts from the standard layout; diverges in its own change. */
export default function CountryConsole() {
  const [engine, rerender] = useWorldEngine(country);
  return <StandardConsole engine={engine} onChange={rerender} />;
}
