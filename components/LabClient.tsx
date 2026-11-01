"use client";

import dynamic from "next/dynamic";

/** The lab is canvas + live simulation state, so it renders on the client only. */
const LabClient = dynamic(() => import("./Lab"), {
  ssr: false,
  loading: () => <div className="wrap"><p className="empty">Loading the lab…</p></div>,
});

export default LabClient;
