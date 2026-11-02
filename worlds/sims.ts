import type { AnySandbox, SandboxKey } from "@/lib/sim/types";
import { galaxy } from "./galaxy/sim";
import { solar } from "./solar/sim";
import { earth } from "./earth/sim";
import { country } from "./country/sim";
import { animals } from "./animals/sim";
import { child } from "./child/sim";
import { person } from "./person/sim";

/** Every world's simulation in one map, for tests. The app loads each sim only on its own page. */
export const SANDBOXES: Record<SandboxKey, AnySandbox> = { galaxy, solar, earth, country, animals, child, person };
