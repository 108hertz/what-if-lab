"use client";

import { useEffect, useRef } from "react";
import StandardConsole from "@/components/console/StandardConsole";
import ViewBar from "@/components/console/ViewBar";
import { useWorldEngine } from "@/components/console/engines";
import { solar } from "./sim";
import { SOLAR_PITCH, solarStage } from "./interaction";
import { worldSay } from "@/lib/sim/say";
import CompareSizes from "./Compare";

/**
 * The solar world's console: the standard layout, with the space camera and Look / Throw on the stage (change 0036),
 * and "Compare sizes" under the settings (change 0037).
 */
export default function SolarConsole() {
  const [engine, rerender] = useWorldEngine(solar);
  // A new star system is a new size: the camera goes back to that system's own framing
  const sys = useRef(engine.params.sys);
  useEffect(() => {
    if (sys.current === engine.params.sys) return;
    sys.current = engine.params.sys;
    if (engine.ui.view) engine.ui.view = { ...engine.ui.view, zoom: 1, tx: 0, ty: 0, tz: 0 };
  });
  const say = worldSay(solar);
  const compare = <CompareSizes engine={engine} onChange={rerender} />;
  return (
    <StandardConsole engine={engine} onChange={rerender} interaction={solarStage}
      onStage={<ViewBar engine={engine} onChange={rerender} pitch={SOLAR_PITCH} throwable />}
      afterTune={compare}
      pick={{ label: say(`ctl.sys.opt.${engine.params.sys}`), title: say("cmp.title"), content: compare }} />
  );
}
