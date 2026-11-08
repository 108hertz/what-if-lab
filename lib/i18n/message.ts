/**
 * A small ICU MessageFormat subset (ADR 0010), built on Intl. Framework-free.
 *
 *   Hello {name}                         argument
 *   {n, number}                          number in the locale's style
 *   {n, plural, =0 {none} one {# kid} other {# kids}}   plural (# = the number, locale-formatted)
 *   {x, select, cat {a cat} other {something}}           select
 *   '{' or '}' quote a brace, '' is one apostrophe (ICU rules).
 */

export type Ref = { k: string; v?: Values };
/** Message values must stay plain data (sim logs hold them): numbers, strings, or a reference to another key. */
export type Value = number | string | Ref;
export type Values = Record<string, Value>;

type Node =
  | string
  | { a: string }
  | { a: string; num: true }
  | { a: string; plural: Record<string, Node[]> }
  | { a: string; select: Record<string, Node[]> }
  | { hash: true };

export class MessageError extends Error {}

function parse(src: string): Node[] {
  let i = 0;

  function text(inPlural: boolean): Node[] {
    const out: Node[] = [];
    let buf = "";
    const flush = () => { if (buf) { out.push(buf); buf = ""; } };
    while (i < src.length) {
      const c = src[i];
      if (c === "'") {
        if (src[i + 1] === "'") { buf += "'"; i += 2; continue; }
        if (src[i + 1] === "{" || src[i + 1] === "}" || (inPlural && src[i + 1] === "#")) {
          const end = src.indexOf("'", i + 1);
          if (end < 0) { buf += src.slice(i + 1); i = src.length; break; }
          buf += src.slice(i + 1, end).replace(/''/g, "'");
          i = end + 1;
          continue;
        }
        buf += c; i++; continue;
      }
      if (c === "}") break;
      if (c === "{") { flush(); out.push(arg()); continue; }
      if (c === "#" && inPlural) { flush(); out.push({ hash: true }); i++; continue; }
      buf += c; i++;
    }
    flush();
    return out;
  }

  function word(): string {
    skip();
    const m = /^[^\s,{}]+/.exec(src.slice(i));
    if (!m) throw new MessageError(`Expected a name at ${i} in "${src}"`);
    i += m[0].length;
    return m[0];
  }
  const skip = () => { while (/\s/.test(src[i] ?? "")) i++; };
  function expect(ch: string) {
    skip();
    if (src[i] !== ch) throw new MessageError(`Expected "${ch}" at ${i} in "${src}"`);
    i++;
  }

  function arg(): Node {
    expect("{");
    const a = word();
    skip();
    if (src[i] === "}") { i++; return { a }; }
    expect(",");
    const kind = word();
    skip();
    if (kind === "number") { expect("}"); return { a, num: true }; }
    if (kind !== "plural" && kind !== "select") throw new MessageError(`Unknown argument type "${kind}" in "${src}"`);
    expect(",");
    const cases: Record<string, Node[]> = {};
    for (;;) {
      skip();
      if (src[i] === "}") { i++; break; }
      const sel = word();
      expect("{");
      cases[sel] = text(kind === "plural");
      expect("}");
    }
    if (!("other" in cases)) throw new MessageError(`"${a}" needs an "other" case in "${src}"`);
    return kind === "plural" ? { a, plural: cases } : { a, select: cases };
  }

  const nodes = text(false);
  if (i < src.length) throw new MessageError(`Unexpected "}" at ${i} in "${src}"`);
  return nodes;
}

const parsed = new Map<string, Node[]>();
export function compile(src: string): Node[] {
  let n = parsed.get(src);
  if (!n) { n = parse(src); parsed.set(src, n); }
  return n;
}

/** Placeholder names a message uses (for parity tests between languages). */
export function argNames(src: string): string[] {
  const names = new Set<string>();
  const walk = (ns: Node[]) => {
    for (const n of ns) {
      if (typeof n === "string" || "hash" in n) continue;
      names.add(n.a);
      const cases = "plural" in n ? n.plural : "select" in n ? n.select : null;
      if (cases) Object.values(cases).forEach(walk);
    }
  };
  walk(compile(src));
  return [...names].sort();
}

/** Plural case keys a message uses, per argument. */
export function pluralCases(src: string): string[][] {
  const out: string[][] = [];
  const walk = (ns: Node[]) => {
    for (const n of ns) {
      if (typeof n === "string" || "hash" in n) continue;
      if ("plural" in n) { out.push(Object.keys(n.plural)); Object.values(n.plural).forEach(walk); }
      if ("select" in n) Object.values(n.select).forEach(walk);
    }
  };
  walk(compile(src));
  return out;
}

/* ---------- Intl caches ---------- */

const numFmts = new Map<string, Intl.NumberFormat>();
export function numberFormat(tag: string, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = tag + JSON.stringify(opts ?? {});
  let f = numFmts.get(key);
  if (!f) { f = new Intl.NumberFormat(tag, opts); numFmts.set(key, f); }
  return f;
}

const pluralRules = new Map<string, Intl.PluralRules>();
export function pluralRule(tag: string): Intl.PluralRules {
  let r = pluralRules.get(tag);
  if (!r) { r = new Intl.PluralRules(tag); pluralRules.set(tag, r); }
  return r;
}

/* ---------- formatting ---------- */

export type Resolve = (ref: Ref) => string;

export function format(src: string, tag: string, values: Values = {}, resolve: Resolve = (r) => r.k): string {
  const show = (v: Value | undefined, name: string): string =>
    v == null ? `{${name}}` : typeof v === "number" ? numberFormat(tag).format(v) : typeof v === "string" ? v : resolve(v);

  const run = (nodes: Node[], hash?: number): string => {
    let s = "";
    for (const n of nodes) {
      if (typeof n === "string") s += n;
      else if ("hash" in n) s += hash == null ? "#" : numberFormat(tag).format(hash);
      else if ("num" in n) { const v = values[n.a]; s += typeof v === "number" ? numberFormat(tag).format(v) : show(v, n.a); }
      else if ("plural" in n) {
        const v = Number(typeof values[n.a] === "number" ? values[n.a] : NaN);
        const exact = n.plural[`=${v}`];
        const cat = isFinite(v) ? pluralRule(tag).select(v) : "other";
        s += run(exact ?? n.plural[cat] ?? n.plural.other, isFinite(v) ? v : undefined);
      } else if ("select" in n) {
        const v = values[n.a];
        const key = typeof v === "string" ? v : typeof v === "number" ? String(v) : v ? v.k : "other";
        s += run(n.select[key] ?? n.select.other, hash);
      } else s += show(values[n.a], n.a);
    }
    return s;
  };

  return run(compile(src));
}
