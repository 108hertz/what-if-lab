"use client";

import dynamic from "next/dynamic";

/** The lab is canvas + live simulation state, so it renders on the client only; LabPage puts static words beside it. */
const LabClient = dynamic(() => import("./Lab"), {
  ssr: false,
  // The static PageIntro (change 0025) is on screen while this loads.
  loading: () => null,
});

export default LabClient;
