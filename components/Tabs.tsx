import Link from "next/link";
import { MODES, SANDBOXES, modeHref, type Mode } from "@/lib/sim/registry";

const label = (m: Mode): [string, string] => (m === "scale" ? ["Scale", "Proton → universe"] : [SANDBOXES[m].name, SANDBOXES[m].sub]);

export default function Tabs({ mode }: { mode: Mode }) {
  return (
    <nav className="tabs" aria-label="Worlds">
      {MODES.map((m) => {
        const [name, sub] = label(m);
        return (
          <Link key={m} href={modeHref(m)} aria-current={m === mode ? "page" : undefined}>
            <b>{name}</b>
            <small>{sub}</small>
          </Link>
        );
      })}
    </nav>
  );
}
