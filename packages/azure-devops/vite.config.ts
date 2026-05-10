import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function amdToEsm(): Plugin {
  return {
    name: "amd-to-esm",
    enforce: "pre",
    load(id) {
      if (!id.includes("azure-devops-extension-api") || id.includes(".vite")) {
        return null;
      }

      let code: string;
      try {
        code = fs.readFileSync(id, "utf8");
      } catch {
        return null;
      }

      const defineIdx = code.indexOf("define(");
      if (defineIdx === -1) return null;

      const preamble = code.slice(0, defineIdx).trim();
      const defineBlock = code.slice(defineIdx);

      const match = defineBlock.match(
        /define\(\s*\[([\s\S]*?)\]\s*,\s*function\s*\(([\s\S]*?)\)\s*\{([\s\S]*)\}\s*\)\s*;?\s*$/
      );
      if (!match) return null;

      const deps = match[1].split(",").map((d) => d.trim().replace(/['"]/g, ""));
      const args = match[2].split(",").map((a) => a.trim());
      let body = match[3];

      const isBarrel = body.includes("__export(");

      if (isBarrel) {
        const imports: string[] = [];
        const names: string[] = [];
        let idx = 0;
        for (let i = 0; i < deps.length; i++) {
          if (deps[i] === "require" || deps[i] === "exports") continue;
          if (body.includes(`__export(${args[i]})`)) {
            const name = `_re${idx++}`;
            imports.push(`import ${name} from "${deps[i]}";`);
            names.push(name);
          }
        }
        return {
          code: `${imports.join("\n")}\nvar exports = Object.assign({}, ${names.join(", ")});\nexport default exports;\n`,
          syntheticNamedExports: "default",
        };
      }

      const imports: string[] = [];
      for (let i = 0; i < deps.length; i++) {
        if (deps[i] === "require" || deps[i] === "exports") continue;
        imports.push(`import * as ${args[i]} from "${deps[i]}";`);
      }

      body = body.replace(/^\s*"use strict";\s*\n?/, "");

      return {
        code: `${imports.join("\n")}\n${preamble ? preamble + "\n" : ""}var exports = {};\n${body}\nexport default exports;\n`,
        syntheticNamedExports: "default",
      };
    },
  };
}

function adoHtmlFix(): Plugin {
  return {
    name: "ado-html-fix",
    enforce: "post",
    transformIndexHtml(html) {
      let result = html
        .replace(/\s+type="module"/g, "")
        .replace(/\s+crossorigin(?:="[^"]*")?/g, "");

      const scripts = result.match(/<script[^>]*src="[^"]*"[^>]*><\/script>/g);

      if (!scripts?.length) {
        return result;
      }

      const mainScript = scripts[scripts.length - 1];

      result = result.replace(mainScript, "");
      result = result.replace("</body>", `  ${mainScript}\n  </body>`);

      return result;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: mode === "development" ? [react()] : [react(), amdToEsm(), adoHtmlFix()],

  base: "./",

  resolve:
    mode === "development"
      ? {
          alias: {
            "azure-devops-extension-sdk": path.resolve(
              __dirname,
              "src/mocks/azure-sdk-stub.ts",
            ),
            "azure-devops-extension-api/WorkItemTracking": path.resolve(
              __dirname,
              "src/mocks/azure-api-wit-stub.ts",
            ),
            "azure-devops-extension-api": path.resolve(
              __dirname,
              "src/mocks/azure-api-stub.ts",
            ),
          },
        }
      : {},

  build: {
    outDir: "dist",
    target: "es2020",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
}));
