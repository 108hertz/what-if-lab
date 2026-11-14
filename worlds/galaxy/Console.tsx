"use client";

import { useEffect, useRef } from "react";
import StandardConsole from "@/components/console/StandardConsole";
import ViewBar from "@/components/console/ViewBar";
import { useWorldEngine } from "@/components/console/engines";
import { withCamera } from "@/components/console/stageCamera";
import { PITCHES } from "@/lib/sim/camera";
import { galaxy } from "./sim";
import { worldSay } from "@/lib/sim/say";
import CompareGalaxies from "./Compare";

/** Discs start tilted about 40° from face-on, as the stage always showed them (change 0009). */
const PITCH = PITCHES.tilted;
const stage = withCamera({ pitch: PITCH });

/**
 * The galaxy world's console: the standard layout with the space camera on the stage (change 0036), and "Compare sizes"
 * under the settings (change 0038).
 */
export default function GalaxyConsole() {
  const [engine, rerender] = useWorldEngine(galaxy);
  // A new pair is a new size: the camera goes back to its own framing
  const pair = `${engine.params.ours}/${engine.params.them}`, last = useRef(pair);
  useEffect(() => {
    if (last.current === pair) return;
    last.current = pair;
    if (engine.ui.view) engine.ui.view = { ...engine.ui.view, zoom: 1, tx: 0, ty: 0, tz: 0 };
  });
  const say = worldSay(galaxy);
  const compare = <CompareGalaxies engine={engine} onChange={rerender} />;
  const chip = say("pick.chip", { ours: say(`ctl.ours.opt.${engine.params.ours}`), them: say(`ctl.them.opt.${engine.params.them}`) });
  return (
    <StandardConsole engine={engine} onChange={rerender} interaction={stage}
      onStage={<ViewBar engine={engine} onChange={rerender} pitch={PITCH} />}
      afterTune={compare}
      pick={{ label: chip, title: say("cmp.title"), content: compare }} />
  );
}
