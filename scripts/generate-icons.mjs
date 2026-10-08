// VidyaOS PWA icon generator.
//
// Rasterizes the SVG app-icon sources in /public into the PNG/ICO assets the
// web app manifest and browsers expect. Run after editing either SVG:
//
//   npm run icons
//
// Uses @resvg/resvg-js (a prebuilt Rust rasterizer) so the icons stay
// SVG-first and reproducible — no design files, no cloud storage, no billing.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

const tileSvg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');
const maskableSvg = readFileSync(resolve(publicDir, 'maskable-icon.svg'), 'utf8');

/** Rasterize an SVG string to PNG bytes at the given width. */
function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  });
  return Buffer.from(resvg.render().asPng());
}

/** Build a PNG-in-ICO container from a list of { size, png }. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + 16 * images.length;
  images.forEach(({ size, png }, i) => {
    const entry = entries.subarray(i * 16, i * 16 + 16);
    const dim = size >= 256 ? 0 : size; // 0 means 256 in the ICO spec
    entry.writeUInt8(dim, 0); // width
    entry.writeUInt8(dim, 1); // height
    entry.writeUInt8(0, 2); // palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    offset += png.length;
  });

  return Buffer.concat([header, entries, ...images.map((i) => i.png)]);
}

const outputs = [
  // Browser tab / general purpose (rounded brand tile)
  ['favicon-16x16.png', tileSvg, 16],
  ['favicon-32x32.png', tileSvg, 32],
  ['favicon-192x192.png', tileSvg, 192],
  ['favicon-512x512.png', tileSvg, 512],
  ['favicon.png', tileSvg, 96],
  // iOS home screen
  ['apple-touch-icon.png', tileSvg, 180],
  // Android adaptive / maskable (full-bleed, safe-zone mark)
  ['maskable-192.png', maskableSvg, 192],
  ['maskable-512.png', maskableSvg, 512],
];

for (const [name, svg, size] of outputs) {
  writeFileSync(resolve(publicDir, name), renderPng(svg, size));
  console.log(`✓ ${name} (${size}×${size})`);
}

// favicon.ico — multi-resolution container (16/32/48) so Windows/legacy
// browsers and pinned tabs get a crisp icon.
const ico = buildIco(
  [16, 32, 48].map((size) => ({ size, png: renderPng(tileSvg, size) })),
);
writeFileSync(resolve(publicDir, 'favicon.ico'), ico);
console.log('✓ favicon.ico (16/32/48)');