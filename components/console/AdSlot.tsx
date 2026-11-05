"use client";

import { PREMIUM_ON_SALE, useAccount, usePremium } from "../account/context";
import { adsAllowed } from "../account/state";

/**
 * Reserved ad space (ADR 0007). Fixed size so a filled or empty slot never shifts the layout.
 * Until an ad network is wired up (Phase 3) it renders an intentional empty placeholder.
 * Premium (change 0020): renders nothing at all, so no slot and no ad request ever exists for subscribers.
 */
export type AdSize = "rail" | "box" | "banner";

/** Side rails appear only where the console keeps its width and the 600 px rail fits. */
export const RAILS_QUERY = "(min-width: 1600px) and (min-height: 700px)";

export default function AdSlot({ size, promo }: { size: AdSize; promo?: boolean }) {
  const account = useAccount();
  const premium = usePremium();
  if (!adsAllowed(account)) return null;
  return (
    <aside className={`ad ad-${size}`} aria-label="Advertisement" data-ad-size={size}>
      <span className="micro">Ad</span>
      {promo && (PREMIUM_ON_SALE
        ? <button type="button" className="ad-promo" onClick={() => premium.open("ads")}>Ad-free with Premium · $15/yr</button>
        : <span className="small">Ad-free with Premium · $15/yr</span>)}
    </aside>
  );
}
