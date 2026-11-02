/**
 * Reserved ad space (ADR 0007). Fixed size so a filled or empty slot never shifts the layout.
 * Until an ad network is wired up (Phase 3) it renders an intentional empty placeholder.
 */
export type AdSize = "rail" | "box" | "banner";

/** Side rails appear only where the console keeps its width and the 600 px rail fits. */
export const RAILS_QUERY = "(min-width: 1600px) and (min-height: 700px)";

export default function AdSlot({ size, promo }: { size: AdSize; promo?: boolean }) {
  return (
    <aside className={`ad ad-${size}`} aria-label="Advertisement" data-ad-size={size}>
      <span className="micro">Ad</span>
      {promo && <span className="small">Ad-free with Premium · $15/yr</span>}
    </aside>
  );
}
