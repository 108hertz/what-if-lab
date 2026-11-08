import type { Mode } from "@/worlds/registry";
import { pageCopy } from "./pageCopy";

/**
 * The page in plain HTML (change 0025): a heading, what the page is, its what-ifs and links to every other page,
 * in the page's language. Crawlers and slow phones read it while the lab loads; CSS hides it once the lab is
 * on screen (`body:has(.app)`), so the console still fills one viewport.
 */
export default function PageIntro({ locale, mode }: { locale: string; mode: Mode }) {
  const c = pageCopy(locale, mode);
  return (
    <main className="page-intro">
      <h1 className="title">{c.heading}</h1>
      <p className="desc">{c.description}</p>
      {c.whatifs.length > 0 && (
        <section>
          <h2 className="headline">{c.whatifsHeading}</h2>
          <ul>{c.whatifs.map((w) => <li key={w} className="desc">{w}</li>)}</ul>
        </section>
      )}
      <nav aria-label={c.linksHeading}>
        <h2 className="headline">{c.linksHeading}</h2>
        <ul>
          {c.links.map((l) => (
            <li key={l.href}><a href={l.href}>{l.name}</a> <span className="sub">{l.sub}</span></li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
