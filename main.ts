// Competition: news-image-20261125
// Edition: Wednesday 25 November 2026
// Purpose: Delivers the broadsheet front-page poster chronicling the news of Wednesday 25 November 2026
// by verifying and copying entry.png to the target directory designated by MAKEFUN_OUTPUT_DIR.
// Exit behaviour: Terminates with code 0 on successful verification and copy; throws descriptive
// error messages to stderr and exits non-zero whenever any environmental or validation condition fails.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface ImageDimensions {
  width: number;
  height: number;
}

function formatBytes(totalBytes: number): string {
  if (totalBytes < 1024) {
    return `${totalBytes} B`;
  }
  const kibibytes = (totalBytes / 1024).toFixed(2);
  return `${kibibytes} KiB (${totalBytes.toLocaleString()} bytes)`;
}

function validatePng(payload: Buffer): ImageDimensions {
  const EXPECTED_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (payload.length < 24) {
    throw new Error(`Buffer length (${payload.length} bytes) is insufficient for a valid PNG file (requires >= 24 bytes)`);
  }

  for (let index = 0; index < EXPECTED_MAGIC.length; index++) {
    if (payload[index] !== EXPECTED_MAGIC[index]) {
      const expectedHex = EXPECTED_MAGIC[index].toString(16).padStart(2, '0');
      const actualHex = (payload[index] ?? 0).toString(16).padStart(2, '0');
      throw new Error(`Invalid PNG signature byte at offset ${index}: expected 0x${expectedHex}, encountered 0x${actualHex}`);
    }
  }

  const chunkMarker = payload.toString('latin1', 12, 16);
  if (chunkMarker !== 'IHDR') {
    throw new Error(`Initial PNG chunk header must be "IHDR", found "${chunkMarker}"`);
  }

  const width = payload.readUInt32BE(16);
  const height = payload.readUInt32BE(20);

  if (width === 0 || height === 0) {
    throw new Error(`Corrupted PNG dimensions in IHDR header: width=${width}, height=${height}`);
  }

  return { width, height };
}

function main(): void {
  const targetDirEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (!targetDirEnv || targetDirEnv.trim().length === 0) {
    throw new Error('Environment variable MAKEFUN_OUTPUT_DIR is required and cannot be empty or unset');
  }
  const targetDir = targetDirEnv.trim();

  try {
    mkdirSync(targetDir, { recursive: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create requested output directory "${targetDir}": ${reason}`);
  }

  if (!existsSync(targetDir)) {
    throw new Error(`Target directory "${targetDir}" could not be confirmed on filesystem`);
  }

  const sourceAssetUrl = new URL('./entry.png', import.meta.url);
  if (!existsSync(sourceAssetUrl)) {
    throw new Error(`Source poster image was not found at expected path: ${sourceAssetUrl.pathname}`);
  }

  const sourceStats = statSync(sourceAssetUrl);
  if (sourceStats.size === 0) {
    throw new Error(`Source poster image at ${sourceAssetUrl.pathname} is empty (0 bytes)`);
  }

  const destinationPath = join(targetDir, 'entry.png');
  copyFileSync(sourceAssetUrl, destinationPath);

  const destinationStats = statSync(destinationPath);
  if (!destinationStats.isFile()) {
    throw new Error(`Destination destination "${destinationPath}" is not a regular file`);
  }

  if (destinationStats.size !== sourceStats.size) {
    throw new Error(`Byte size mismatch after copy: expected source size ${sourceStats.size} B, got destination size ${destinationStats.size} B`);
  }

  const copiedBytes = readFileSync(destinationPath);
  const { width, height } = validatePng(copiedBytes);

  console.log(`Copied ${destinationStats.size} bytes (source: ${sourceStats.size} bytes, dimensions: ${width}x${height} px) to ${destinationPath}`);
}

main();
