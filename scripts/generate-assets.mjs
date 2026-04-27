import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'assets');

// ─── 1. Splash screen ────────────────────────────────────────────────────────
// "P1" sans fond (luminosité = alpha) centré sur fond #0D0D0F, canvas 1284x2778

const SPLASH_W = 1284;
const SPLASH_H = 2778;
const LOGO_SIZE = 420; // taille du P1 dans le splash

// Extraire uniquement les pixels blancs du P1 (fond transparent)
// normalise() étire le contraste, puis on coupe les pixels sombres à 0
const { data: logoData } = await sharp(path.join(assetsDir, 'icon.png'))
  .resize(LOGO_SIZE, LOGO_SIZE)
  .greyscale()
  .normalise()
  .raw()
  .toBuffer({ resolveWithObject: true });

const logoRgba = Buffer.alloc(LOGO_SIZE * LOGO_SIZE * 4);
for (let i = 0; i < LOGO_SIZE * LOGO_SIZE; i++) {
  const lum = logoData[i];
  logoRgba[i * 4]     = 255;
  logoRgba[i * 4 + 1] = 255;
  logoRgba[i * 4 + 2] = 255;
  logoRgba[i * 4 + 3] = lum < 128 ? 0 : lum; // fond sombre → transparent
}

const logoBuffer = await sharp(logoRgba, {
  raw: { width: LOGO_SIZE, height: LOGO_SIZE, channels: 4 },
}).png().toBuffer();

const left = Math.floor((SPLASH_W - LOGO_SIZE) / 2);
const top  = Math.floor((SPLASH_H - LOGO_SIZE) / 2);

await sharp({
  create: { width: SPLASH_W, height: SPLASH_H, channels: 3, background: { r: 13, g: 13, b: 15 } },
})
  .composite([{ input: logoBuffer, left, top }])
  .png()
  .toFile(path.join(assetsDir, 'splash.png'));

console.log('✅ splash.png créé (1284x2778)');

// ─── 2. Adaptive icon ────────────────────────────────────────────────────────
// icon.png → luminosité = canal alpha → blanc pur sur transparent

const { data } = await sharp(path.join(assetsDir, 'icon.png'))
  .resize(1024, 1024)
  .greyscale()
  .normalise()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.alloc(1024 * 1024 * 4);
for (let i = 0; i < 1024 * 1024; i++) {
  const lum = data[i];
  rgba[i * 4]     = 255;
  rgba[i * 4 + 1] = 255;
  rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = lum < 128 ? 0 : lum;
}

await sharp(rgba, { raw: { width: 1024, height: 1024, channels: 4 } })
  .png()
  .toFile(path.join(assetsDir, 'adaptive-icon.png'));

console.log('✅ adaptive-icon.png créé (1024x1024 RGBA)');

// ─── 3. Mipmap Android ───────────────────────────────────────────────────────
// Foreground (P1 blanc sur transparent) + launcher icon (P1 sur fond noir)
// en WebP pour chaque densité

const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const densities = [
  { folder: 'mipmap-mdpi',    launcher: 48,  foreground: 108 },
  { folder: 'mipmap-hdpi',    launcher: 72,  foreground: 162 },
  { folder: 'mipmap-xhdpi',   launcher: 96,  foreground: 216 },
  { folder: 'mipmap-xxhdpi',  launcher: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
];

// Source foreground : adaptive-icon.png (blanc sur transparent, déjà généré)
const fgSource = path.join(assetsDir, 'adaptive-icon.png');
// Source launcher : icon.png (P1 sur fond sombre)
const launcherSource = path.join(assetsDir, 'icon.png');

for (const d of densities) {
  const dir = path.join(resDir, d.folder);

  // ic_launcher_foreground.webp
  await sharp(fgSource)
    .resize(d.foreground, d.foreground)
    .webp({ lossless: true })
    .toFile(path.join(dir, 'ic_launcher_foreground.webp'));

  // ic_launcher.webp
  await sharp(launcherSource)
    .resize(d.launcher, d.launcher)
    .webp({ lossless: true })
    .toFile(path.join(dir, 'ic_launcher.webp'));

  // ic_launcher_round.webp (même chose, Android arrondit lui-même)
  await sharp(launcherSource)
    .resize(d.launcher, d.launcher)
    .webp({ lossless: true })
    .toFile(path.join(dir, 'ic_launcher_round.webp'));

  console.log(`✅ mipmap ${d.folder} généré`);
}
