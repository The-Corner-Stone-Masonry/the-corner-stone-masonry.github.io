// Regenerate responsive variants from the untouched source images.
// Requires sharp (available through NODE_PATH in the bundled Codex runtime).
// Run: node scripts/optimize-images.cjs
const path = require('node:path');
const sharp = require('sharp');

const assets = path.resolve(__dirname, '..', 'assets');
const photos = [
  'garage-stone-veneer-exterior',
  'modern-stone-fireplace',
  'kitchen-brick-backsplash-closeup',
  'rustic-stone-fireplace',
  'exterior-limestone-veneer-window',
  'commercial-building-masonry'
];
const specs = [
  ...photos.map((name) => ({ name, widths: name === 'kitchen-brick-backsplash-closeup' ? [480, 600, 800, 1200, 1600] : [480, 800, 1200, 1600] })),
  { name: 'residential-stone-veneer-exterior', widths: [800, 1200, 1400, 1600, 2049], avifQuality: 42 },
  { name: 'cornerstone-masonry-logo-cutout', widths: [112, 224, 336], logo: true }
];

async function main() {
  let total = 0;
  for (const { name, widths, logo, avifQuality = 50 } of specs) {
    const input = path.join(assets, `${name}.webp`);
    const source = await sharp(input).metadata();
    for (const width of widths) {
      if (width > source.width) continue;
      for (const format of logo ? ['webp'] : ['webp', 'avif']) {
        const filename = `${name}-${width}w.${format}`;
        const output = path.join(assets, filename);
        const resized = sharp(input).resize({ width, withoutEnlargement: true });
        const encoded = format === 'avif'
          ? resized.avif({ quality: avifQuality, effort: 4 })
          : resized.webp(logo
            ? { quality: 85, alphaQuality: 100, effort: 6 }
            : { quality: 75, effort: 6, smartSubsample: true });
        const result = await encoded.toFile(output);
        if (logo && !(await sharp(output).metadata()).hasAlpha) {
          throw new Error(`Transparency was lost in ${filename}`);
        }
        total += result.size;
        console.log(`${filename}\t${result.width}x${result.height}\t${result.size} bytes`);
      }
    }
  }
  console.log(`Responsive variants: ${total} bytes total. Source images preserved.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

