/**
 * The shared English catalogs, built into the bundle (change 0025): the fallback for every key a language does not
 * have yet, and the words tests and exports see before a page sets its language. A few kilobytes; other languages
 * still travel with their own pages only.
 */

import common from "./locales/en/common.json";
import shell from "./locales/en/shell.json";
import consoleNs from "./locales/en/console.json";
import account from "./locales/en/account.json";
import scale from "./locales/en/scale.json";
import exportNs from "./locales/en/export.json";
import { catalog, merge, type Messages } from "./t";

/** Shared namespaces each language has as JSON; "objects" (the scale objects) is English in code (lib/scale/objects.ts). */
export const SHARED_NS = ["common", "shell", "console", "account", "scale", "export", "objects"] as const;
export type SharedNs = (typeof SHARED_NS)[number];

type Json = Parameters<typeof catalog>[1];
export const EN_SHARED: Messages = merge(
  catalog("common", common as Json), catalog("shell", shell as Json), catalog("console", consoleNs as Json),
  catalog("account", account as Json), catalog("scale", scale as Json), catalog("export", exportNs as Json),
);

