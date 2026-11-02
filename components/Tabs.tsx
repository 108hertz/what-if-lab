import Link from "next/link";
import { MODES, SANDBOXES, modeHref, type Mode } from "@/lib/sim/registry";
import { Icon } from "./ui/Icon";

const label = (m: Mode): [string, string] => (m === "scale" ? ["Scale", "Proton → universe"] : [SANDBOXES[m].name, SANDBOXES[m].sub]);

export default function Tabs({ mode }: { mode: Mode }) {
  return (
    <nav className="tabs" aria-label="Worlds">
      {MODES.map((m) => {
        const [name, sub] = label(m);
        return (
          <Link key={m} href={modeHref(m)} aria-current={m === mode ? "page" : undefined}>
            <Icon name={m} />
            <span>
              <b className="lbl">{name}</b>
              <small className="micro">{sub}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
