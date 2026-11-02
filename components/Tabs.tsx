import Link from "next/link";
import { MODES, SANDBOXES, modeHref, type Mode } from "@/lib/sim/registry";
import { Icon } from "./ui/Icon";

export const modeLabel = (m: Mode): [string, string] => (m === "scale" ? ["Scale", "Proton → universe"] : [SANDBOXES[m].name, SANDBOXES[m].sub]);

/** World switcher strip (≥ 768 px). Phones get WorldMenu instead. */
export default function Tabs({ mode }: { mode: Mode }) {
  return (
    <nav className="tabs" aria-label="Worlds">
      {MODES.map((m) => {
        const [name, sub] = modeLabel(m);
        return (
          <Link key={m} href={modeHref(m)} aria-current={m === mode ? "page" : undefined} title={`${name} · ${sub}`}>
            <Icon name={m} />
            <span className="tab-text">
              <b className="lbl">{name}</b>
              <small className="micro">{sub}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
