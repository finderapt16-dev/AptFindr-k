import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const sourceLogo = `${publicDirectory}aptfindr-logo-source.png`;
const preparedLogo = `${publicDirectory}aptfindr-logo.png`;

// Preserve the supplied blue mark exactly while turning only its
// white canvas and pale neutral logo backdrop into transparency.
const { data, info } = await sharp(sourceLogo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * info.channels;
    const isExportFrame = x < 2 || y < 2 || x >= info.width - 2 || y >= info.height - 2;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const lightest = Math.max(red, green, blue);
    const darkest = Math.min(red, green, blue);
    const isWhiteCanvas = darkest >= 245;
    const isPaleNeutralBackdrop = darkest >= 235 && lightest - darkest <= 18;
    if (isExportFrame || isWhiteCanvas || isPaleNeutralBackdrop) data[offset + 3] = 0;
    if (data[offset + 3] < 96) data[offset + 3] = 0;
    if (data[offset + 3] > 0) {
      data[offset] = 69;
      data[offset + 1] = 142;
      data[offset + 2] = 238;
    }
  }
}
await sharp(data, { raw: info }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(preparedLogo);

const logo = await readFile(preparedLogo);
await mkdir(`${publicDirectory}icons`, { recursive: true });

async function createIcon(file, size, maskable = false) {
  // Maskable artwork stays inside the central safe circle on Android.
  const artworkSize = Math.round(size * (maskable ? 0.56 : 0.8));
  const artwork = await sharp(logo)
    .resize(artworkSize, artworkSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
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
