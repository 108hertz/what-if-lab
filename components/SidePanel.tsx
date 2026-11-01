"use client";

import type { SimEngine } from "@/lib/sim/engine";
import ControlsForm from "./ControlsForm";

export default function SidePanel({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const { sb } = engine;
  const { base, alt } = engine.readouts();
  const info = sb.info?.(engine.base, engine.alt, engine.params) ?? [];
  return (
    <>
      <div>
        <p className="sbname">{sb.name}</p>
        <p className="intro">{sb.intro}</p>
      </div>
      <div>
        <h3>What if…</h3>
        <div className="forks">
          {sb.whatifs.map(([id, label]) => (
            <button key={id} className="fork" aria-pressed={engine.whatIf === id} onClick={() => { engine.fork(id); onChange(); }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3>Right now</h3>
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
              {block.heading && <h3 style={block.accent ? { color: "var(--alt)" } : undefined}>{block.heading}</h3>}
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
        <summary>Starting conditions</summary>
        <ControlsForm engine={engine} onChange={onChange} />
        <p className="small">Changing these restarts the world.</p>
      </details>
    </>
  );
}
