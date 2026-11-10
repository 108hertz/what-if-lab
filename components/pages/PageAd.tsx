"use client";

import { useEffect, useState } from "react";
import { premiumHint, readDevPremium } from "../account/state";
import AdSlot, { ADS_ON } from "../console/AdSlot";

/**
 * The 300×250 slot of a reading page (change 0033: a what-if page, after its steps; ADR 0007 keeps it away from the
 * picture and the button). These pages load no account provider, so a device that has Premium (the remembered hint or
 * the dev switch) gets no slot. Joins after load, so the pre-rendered page never shows an ad to a subscriber.
 */
export default function PageAd() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(ADS_ON && !premiumHint() && !readDevPremium()); }, []);
  return show ? <div className="whatif-ad"><AdSlot size="box" /></div> : null;
}
