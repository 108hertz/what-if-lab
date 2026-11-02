"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { SandboxKey } from "@/lib/sim/types";

const loading = () => <main className="console"><p className="empty">Loading the world…</p></main>;

/** Each world's console, code-split: a world page downloads only its own sim and UI. */
export const WORLD_VIEWS: Record<SandboxKey, ComponentType> = {
  galaxy: dynamic(() => import("./galaxy/Console"), { ssr: false, loading }),
  solar: dynamic(() => import("./solar/Console"), { ssr: false, loading }),
  earth: dynamic(() => import("./earth/Console"), { ssr: false, loading }),
  country: dynamic(() => import("./country/Console"), { ssr: false, loading }),
  animals: dynamic(() => import("./animals/Console"), { ssr: false, loading }),
  child: dynamic(() => import("./child/Console"), { ssr: false, loading }),
  person: dynamic(() => import("./person/Console"), { ssr: false, loading }),
};
