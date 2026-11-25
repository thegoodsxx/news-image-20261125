// Competition: news-image-20261125
// Edition: Wednesday 25 November 2026
// Purpose: Sums up the world news of Wednesday 25 November 2026 in a broadsheet newspaper poster
// by copying entry.png to the target directory specified by MAKEFUN_OUTPUT_DIR.
// Exit behaviour: Exits with status 0 upon successful copy and verification; terminates with a
// non-zero status and throws a descriptive error to stderr if any verification check fails.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR;
if (!outDir || outDir.trim() === '') {
  throw new Error('Environment variable MAKEFUN_OUTPUT_DIR is required and must not be empty');
}

try {
  mkdirSync(outDir, { recursive: true });
} catch (err) {
  throw new Error(`Failed to create output directory "${outDir}": ${err instanceof Error ? err.message : String(err)}`);
}

if (!existsSync(outDir)) {
  throw new Error(`Output directory does not exist and could not be created: ${outDir}`);
}

const srcUrl = new URL('./entry.png', import.meta.url);
if (!existsSync(srcUrl)) {
  throw new Error(`Source poster image not found at expected path: ${srcUrl.pathname}`);
}

const srcStats = statSync(srcUrl);
if (srcStats.size === 0) {
  throw new Error(`Source poster image is empty (0 bytes): ${srcUrl.pathname}`);
}

const destPath = join(outDir, 'entry.png');
copyFileSync(srcUrl, destPath);

const destStats = statSync(destPath);
if (destStats.size !== srcStats.size) {
  throw new Error(`Copied file size mismatch: expected ${srcStats.size} bytes, got ${destStats.size} bytes`);
}

if (!destStats.isFile()) {
  throw new Error(`Copied destination is not a regular file: ${destPath}`);
}

const outputBytes = readFileSync(destPath);
const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
if (outputBytes.length < pngMagic.length) {
  throw new Error(`Output file is smaller than PNG header length (${outputBytes.length} < 8 bytes)`);
}

for (let i = 0; i < pngMagic.length; i++) {
  if (outputBytes[i] !== pngMagic[i]) {
    throw new Error(`Invalid PNG magic byte at position ${i}: expected 0x${pngMagic[i].toString(16)}, found 0x${outputBytes[i]?.toString(16)}`);
  }
}

console.log(`Copied ${destStats.size} bytes (source: ${srcStats.size} bytes) to ${destPath}`);
