/**
 * Generates placeholder icons for development
 *
 * In production, replace these with proper icon assets
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const sizes = [16, 32, 48, 128];
const outputDir = join(import.meta.dir, '../public/icons');

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

/**
 * Creates a simple PNG buffer for a solid color square
 * This creates a valid PNG with a simple blue color
 */
function createPlaceholderPNG(size: number): Buffer {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const width = size;
  const height = size;
  const bitDepth = 8;
  const colorType = 2; // RGB
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  // For simplicity, create uncompressed data with zlib wrapper
  const rawData: number[] = [];
  const color = [0x1a, 0x73, 0xe8]; // Blue (#1a73e8)

  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte (none)
    for (let x = 0; x < width; x++) {
      rawData.push(...color);
    }
  }

  // Compress with zlib
  const { deflateSync } = require('zlib');
  const compressed = deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Creates a PNG chunk with CRC
 */
function createChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * CRC32 implementation for PNG chunks
 */
function crc32(data: Buffer): number {
  const table = makeCRC32Table();
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return crc ^ 0xffffffff;
}

function makeCRC32Table(): number[] {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

// Generate icons
for (const size of sizes) {
  const png = createPlaceholderPNG(size);
  const filename = `icon-${size}.png`;
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, png);
  console.log(`Generated ${filename}`);
}

console.log('Done! Placeholder icons generated.');
