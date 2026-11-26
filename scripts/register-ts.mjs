// Lets Node run the app's TypeScript directly: maps the "@/" alias to the
// project root and adds the ".ts" that the app's own imports leave out. Node
// strips the types itself. Packages in node_modules resolve as usual.
// Used by scripts/analyze-image.ts.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";

const root = new URL("../", import.meta.url);

const isAppFile = (url) => url.startsWith(root.href) && !url.includes("/node_modules/");

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith("@/")) {
      target = new URL(specifier.slice(2), root).href;
    } else if (specifier.startsWith(".") && context.parentURL && isAppFile(context.parentURL)) {
      target = new URL(specifier, context.parentURL).href;
    }
    if (target && existsSync(new URL(`${target}.ts`))) {
      return nextResolve(`${target}.ts`, context);
    }
    return nextResolve(target ?? specifier, context);
  },
});
