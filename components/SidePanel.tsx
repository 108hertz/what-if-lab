"use client";

import type { SimEngine } from "@/lib/sim/engine";
import ControlsForm from "./ControlsForm";
import { Icon } from "./ui/Icon";

export default function SidePanel({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const { sb } = engine;
  const { base, alt } = engine.readouts();
  const info = sb.info?.(engine.base, engine.alt, engine.params) ?? [];
  return (
    <>
      <div>
        <h2 className="title">{sb.name}</h2>
        <p className="intro">{sb.intro}</p>
      </div>
      <div>
        <h3 className="headline">What if</h3>
        <div className="forks">
          {sb.whatifs.map(([id, label]) => (
            <button key={id} className="fork" aria-pressed={engine.whatIf === id} onClick={() => { engine.fork(id); onChange(); }}>
              <Icon name="fork" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="headline">Right now</h3>
        <table>
          <thead><tr><th /><th>No change</th>{alt && <th>What if</th>}</tr></thead>
          <tbody>
            {sb.metrics.map((m) => (
              <tr key={m.k}>
                <td>{m.label}{m.unit && m.unit !== "/100" && <span className="unit"> {m.unit}</span>}</td>
                <td>{m.fmt(base[m.k])}</td>
                {alt && <td className="a">{m.fmt(alt[m.k])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {info.length > 0 && (
        <div className="info">
          {info.map((block, i) => (
            <div key={i}>
              {block.heading && <h3 className={block.accent ? "headline accent" : "headline"}>{block.heading}</h3>}
              <dl>
                {block.rows.map((r, j) => (
                  <div key={j}>
                    {r.label && <dt>{r.label}</dt>}
                    <dd>{r.color && <span className="key" style={{ background: r.color }} />}{r.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
      <details open={sb.key === "animals" || sb.key === "country"}>
        <summary><h3 className="headline">Starting conditions</h3><Icon name="chevron" /></summary>
        <ControlsForm engine={engine} onChange={onChange} />
        <p className="small">Changing these restarts the world.</p>
      </details>
    </>
  );
}
