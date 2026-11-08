"use client";

import Dialog from "../ui/Dialog";
import { Icon, type IconName } from "../ui/Icon";
import { useAccount, type PremiumReason } from "./context";
import { setPendingUpgrade } from "./state";
import { useT } from "../i18n/I18nProvider";

const PERKS: IconName[] = ["noads", "phone", "wide", "slides"];

/**
 * The one upsell (change 0020): calm, one card, no countdowns. Its main button follows the account state, so
 * the same dialog walks a visitor from signed out → account → checkout → unlocked without leaving the lab.
 */
export default function PremiumDialog({ reason, onClose }: { reason: PremiumReason | null; onClose: () => void }) {
  const a = useAccount();
  const t = useT(), P = (k: string, v?: Record<string, string>) => t(`account.premium.${k}`, v);
  const done = a.status === "premium" || (a.isPremium && !!a.devPremium?.on);
  // The provider opens its own windows outside our modal layer, so this dialog steps aside first.
  const go = (fn: () => void) => () => { onClose(); fn(); };

  let action: React.ReactNode;
  let note: string | null = null;
  switch (a.status) {
    case "signed-out":
      action = (
        <>
          <button className="btn primary" onClick={go(a.upgrade)}><Icon name="arrow" size={18} />{P("createContinue")}</button>
          <button className="btn" onClick={go(() => { setPendingUpgrade(true); a.signIn(); })}>{P("haveAccount")}</button>
        </>
      );
      note = P("noteSignedOut");
      break;
    case "free":
      action = <button className="btn primary" onClick={go(a.upgrade)} disabled={a.busy}><Icon name="arrow" size={18} />{P(a.busy ? "openingCheckout" : "continueCheckout")}</button>;
      note = P("noteFree", { who: a.user?.email ?? a.user?.name ?? P("you"), provider: a.provider ?? P("ourProvider") });
      break;
    case "premium":
      action = (
        <>
          <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />{P("back")}</button>
          <button className="btn" onClick={go(a.manage)}>{P("manage")}</button>
        </>
      );
      break;
    case "loading":
      action = <button className="btn primary" disabled>{P("checking")}</button>;
      break;
    case "error":
      action = <button className="btn" onClick={a.retry}><Icon name="restart" size={18} />{P("retry")}</button>;
      note = a.error;
      break;
    case "off":
      action = done ? <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />{P("back")}</button> : null;
      note = P(a.devPremium ? "noteDev" : "noteOff");
      break;
  }

  return (
    <Dialog open={reason != null} onClose={onClose} title={P(done ? "titleOn" : "title")} className="premium">
      <div className="premium-price">
        <span className="premium-amount num">{P("amount")}</span>
        <span className="small">{P("per")}</span>
      </div>
      <p className="desc premium-lead">{P(done ? "thanks" : `lead.${reason ?? "menu"}`)}</p>
      <ul className="perks">
        {PERKS.map((icon) => (
          <li key={icon}>
            <Icon name={done ? "check" : icon} />
            <span className="lbl">{P(`perks.${icon}.name`)}</span>
            <span className="small">{P(`perks.${icon}.text`)}</span>
          </li>
        ))}
      </ul>
      <p className="small premium-free">{P("free")}</p>
      {action && <div className="sheet-actions">{action}</div>}
      {note && <p className={`small sheet-note${a.status === "error" ? " is-error" : ""}`} role={a.status === "error" ? "alert" : undefined}>{note}</p>}
      {a.error && a.status !== "error" && <p className="small sheet-note is-error" role="alert">{a.error}</p>}
    </Dialog>
  );
}
