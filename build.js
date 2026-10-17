"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const OUTPUT = path.join(ROOT, "dist");
const PUBLIC_FILES = ["index.html", "styles.css", "app.js", "favicon.svg"];
const PUBLIC_ASSETS = [
  "logo-monogram.png",
  "hoodie-front.png",
  "slogan-neon.png",
  "hoodie-royal-blue.png",
  "hoodie-rose-pink.png",
  "hoodie-black.png",
  "hoodie-orange.png",
  "hoodie-sunshine-yellow.png",
  "coming-soon-zip-hoodie-pink.png",
  "coming-soon-crop-hoodie-red.png",
  "coming-soon-crop-hoodie-blue.png",
  "coming-soon-crop-hoodie-yellow.png",
  "coming-soon-crop-hoodie-black.png",
  "coming-soon-crop-hoodie-purple.png",
  "coming-soon-beanie-black.png",
  "coming-soon-varsity-orange.png",
  "coming-soon-varsity-black-white.png",
  "coming-soon-varsity-purple-white.png",
  "coming-soon-varsity-blue-white.png",
  "coming-soon-varsity-red-white.png",
  "coming-soon-varsity-pink-white.png"
];

fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUTPUT, "assets"), { recursive: true });
for (const file of PUBLIC_FILES) {
  fs.copyFileSync(path.join(ROOT, file), path.join(OUTPUT, file));
}
for (const asset of PUBLIC_ASSETS) {
  fs.copyFileSync(path.join(ROOT, "assets", asset), path.join(OUTPUT, "assets", asset));
}
console.log(`Built Netlify storefront in ${OUTPUT}`);
