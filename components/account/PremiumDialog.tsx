"use client";

import Dialog from "../ui/Dialog";
import { Icon, type IconName } from "../ui/Icon";
import { useAccount, type PremiumReason } from "./context";
import { setPendingUpgrade } from "./state";

const PERKS: [IconName, string, string][] = [
  ["noads", "No ads", "Every ad slot disappears, in every world."],
  ["phone", "Phone videos", "1080 × 1920 clips of your what-if for Shorts, Reels and TikTok."],
  ["wide", "YouTube videos", "1920 × 1080 clips with both worlds side by side."],
  ["slides", "Slides", "A PDF deck: the setup, the what-if, key moments and the outcome."],
];

const LEAD: Record<PremiumReason, string> = {
  export: "Videos and slides are part of Premium.",
  ads: "Premium takes the ads away.",
  menu: "Support the lab and get the tools for sharing what you find.",
};

/**
 * The one upsell (change 0020): calm, one card, no countdowns. Its main button follows the account state, so
 * the same dialog walks a visitor from signed out → account → checkout → unlocked without leaving the lab.
 */
export default function PremiumDialog({ reason, onClose }: { reason: PremiumReason | null; onClose: () => void }) {
  const a = useAccount();
  const done = a.status === "premium" || (a.isPremium && !!a.devPremium?.on);
  // The provider opens its own windows outside our modal layer, so this dialog steps aside first.
  const go = (fn: () => void) => () => { onClose(); fn(); };

  let action: React.ReactNode;
  let note: string | null = null;
  switch (a.status) {
    case "signed-out":
      action = (
        <>
          <button className="btn primary" onClick={go(a.upgrade)}><Icon name="arrow" size={18} />Create account and continue</button>
          <button className="btn" onClick={go(() => { setPendingUpgrade(true); a.signIn(); })}>I have an account</button>
        </>
      );
      note = "First an account, so Premium works on every device. Then checkout opens right here.";
      break;
    case "free":
      action = <button className="btn primary" onClick={go(a.upgrade)} disabled={a.busy}><Icon name="arrow" size={18} />{a.busy ? "Opening checkout…" : "Continue to checkout"}</button>;
      note = `Signed in as ${a.user?.email ?? a.user?.name ?? "you"}. Payment is handled by ${a.provider ?? "our provider"} and Stripe; the lab never sees your card.`;
      break;
    case "premium":
      action = (
        <>
          <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />Back to the lab</button>
          <button className="btn" onClick={go(a.manage)}>Manage subscription</button>
        </>
      );
      break;
    case "loading":
      action = <button className="btn primary" disabled>Checking your account…</button>;
      break;
    case "error":
      action = <button className="btn" onClick={a.retry}><Icon name="restart" size={18} />Try again</button>;
      note = a.error;
      break;
    case "off":
      action = done ? <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />Back to the lab</button> : null;
      note = a.devPremium
        ? "Accounts aren't set up in this build. To try Premium, turn on Simulate Premium in the account menu."
        : "Premium isn't on sale in this version of the lab yet.";
      break;
  }

  return (
    <Dialog open={reason != null} onClose={onClose} title={done ? "Premium is on" : "Premium"} className="premium">
      <div className="premium-price">
        <span className="premium-amount num">$15</span>
        <span className="small">a year · cancel any time</span>
      </div>
      <p className="desc premium-lead">{done ? "Thank you. Ads are gone and exports are unlocked in every world." : LEAD[reason ?? "menu"]}</p>
      <ul className="perks">
        {PERKS.map(([icon, name, text]) => (
          <li key={name}>
            <Icon name={done ? "check" : icon} />
            <span className="lbl">{name}</span>
            <span className="small">{text}</span>
          </li>
        ))}
      </ul>
      <p className="small premium-free">Every world and every what-if stays free, with or without Premium.</p>
      {action && <div className="sheet-actions">{action}</div>}
      {note && <p className={`small sheet-note${a.status === "error" ? " is-error" : ""}`} role={a.status === "error" ? "alert" : undefined}>{note}</p>}
      {a.error && a.status !== "error" && <p className="small sheet-note is-error" role="alert">{a.error}</p>}
    </Dialog>
  );
}
