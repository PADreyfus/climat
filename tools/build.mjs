#!/usr/bin/env node
/**
 * Enveloppe les pages de src/ dans un document HTML complet.
 *
 * Les fichiers de src/ sont écrits au format « artifact » : ils commencent
 * directement par <title> et leur contenu, sans <html> ni <head>, parce que
 * la plateforme d'artifacts ajoute ce squelette à la publication.
 * Pour un hébergement statique ordinaire (GitHub Pages, double-clic, serveur
 * local), il faut le squelette : c'est ce que fait ce script.
 *
 *   node tools/build.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");

const skeleton = (title, head, body) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
${head}<style>
  :root{
    color-scheme: light dark;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  body{ margin:0; font:14px/1.45 system-ui, sans-serif; background:#faf9f7; }
  img{ max-width:100%; }
  [hidden]{ display:none !important; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

for (const file of readdirSync(srcDir).filter(f => f.endsWith(".html"))) {
  let content = readFileSync(join(srcDir, file), "utf8");

  const title = (content.match(/<title>([\s\S]*?)<\/title>/i) || [, file])[1].trim();
  content = content.replace(/<title>[\s\S]*?<\/title>\s*/i, "");

  // les <link> (polices) remontent dans le <head>
  const links = [...content.matchAll(/^\s*<link\b[^>]*>\s*$/gim)].map(m => m[0].trim());
  content = content.replace(/^\s*<link\b[^>]*>\s*$/gim, "");
  const head = links.length ? links.join("\n") + "\n" : "";

  writeFileSync(join(root, file), skeleton(title, head, content.trim() + "\n"));
  console.log(`✓ ${file}  (${(content.length / 1024).toFixed(0)} ko)`);
}
