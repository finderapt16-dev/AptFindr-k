import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const logo = await readFile(`${publicDirectory}aptFindr-logo-exact.svg`);
await mkdir(`${publicDirectory}icons`, { recursive: true });

async function createIcon(file, size, maskable = false) {
  // Maskable artwork stays inside the central safe circle on Android.
  const artworkSize = Math.round(size * (maskable ? 0.56 : 0.8));
  const artwork = await sharp(logo).resize(artworkSize, artworkSize, { fit: "contain" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#f2f6fa" } })
    .composite([{ input: artwork, gravity: "centre" }])
    .png()
    .toFile(`${publicDirectory}icons/${file}`);
}

await Promise.all([
  createIcon("icon-192.png", 192),
  createIcon("icon-512.png", 512),
  createIcon("icon-maskable-192.png", 192, true),
  createIcon("icon-maskable-512.png", 512, true),
  createIcon("apple-touch-icon.png", 180),
]);
console.log("PWA icons generated from the AptFindr logo.");
