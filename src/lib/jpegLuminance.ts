/**
 * Mean brightness (0-255) of a small JPEG, read without decoding its pixels.
 *
 * A JPEG stores each 8x8 block's average brightness as the block's first
 * ("DC") coefficient. For an image resized to 8x8, the first luminance block
 * is the whole image, so that one coefficient is its mean luminance. Reading
 * it needs only the quantisation and Huffman tables and the first few bits of
 * image data, not a full decoder.
 *
 * Returns null for anything unexpected (progressive encoding, a luminance
 * channel that isn't first, truncated data), so callers can fall back.
 */
export function meanLuminanceFromJpeg(base64: string): number | null {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  } catch {
    // Not valid base64, so not a readable JPEG either.
    return null;
  }
  return meanLuminanceFromJpegBytes(bytes);
}

interface HuffmanTable {
  /** Smallest code of each length 1-16 (index = length). */
  minCode: number[];
  /** Largest code of each length, or -1 when there are none. */
  maxCode: number[];
  /** Index into `values` of the first code of each length. */
  valueOffset: number[];
  values: number[];
}

const MARKER_SOI = 0xd8;
const MARKER_SOF0 = 0xc0;
const MARKER_SOF1 = 0xc1;
const MARKER_DHT = 0xc4;
const MARKER_DQT = 0xdb;
const MARKER_SOS = 0xda;
const MARKER_EOI = 0xd9;

/** Frame types other than baseline and extended sequential Huffman. */
function isUnsupportedFrame(marker: number): boolean {
  return (
    marker >= 0xc2 && marker <= 0xcf && marker !== MARKER_DHT && marker !== 0xc8 && marker !== 0xcc
  );
}

function buildHuffmanTable(counts: number[], values: number[]): HuffmanTable {
  const minCode: number[] = new Array(17).fill(0);
  const maxCode: number[] = new Array(17).fill(-1);
  const valueOffset: number[] = new Array(17).fill(0);
  let code = 0;
  let index = 0;
  for (let length = 1; length <= 16; length += 1) {
    const count = counts[length - 1];
    if (count > 0) {
      valueOffset[length] = index;
      minCode[length] = code;
      code += count;
      index += count;
      maxCode[length] = code - 1;
    }
    code <<= 1;
  }
  return { minCode, maxCode, valueOffset, values };
}

export function meanLuminanceFromJpegBytes(bytes: Uint8Array): number | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== MARKER_SOI) return null;

  const quantDc = new Map<number, number>();
  const dcTables = new Map<number, HuffmanTable>();
  let lumaComponentId: number | null = null;
  let lumaQuantTable: number | null = null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === MARKER_EOI) return null;

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const start = offset + 4;
    const end = offset + 2 + length;
    if (length < 2 || end > bytes.length) return null;

    if (isUnsupportedFrame(marker)) return null;

    if (marker === MARKER_DQT) {
      let cursor = start;
      while (cursor < end) {
        const precision = bytes[cursor] >> 4;
        const id = bytes[cursor] & 0x0f;
        const first =
          precision === 0 ? bytes[cursor + 1] : (bytes[cursor + 1] << 8) | bytes[cursor + 2];
        quantDc.set(id, first);
        cursor += 1 + 64 * (precision === 0 ? 1 : 2);
      }
    } else if (marker === MARKER_SOF0 || marker === MARKER_SOF1) {
      // Components start after precision (1), height (2), width (2), count (1).
      const firstComponent = start + 6;
      lumaComponentId = bytes[firstComponent];
      lumaQuantTable = bytes[firstComponent + 2];
    } else if (marker === MARKER_DHT) {
      let cursor = start;
      while (cursor < end) {
        const tableClass = bytes[cursor] >> 4;
        const id = bytes[cursor] & 0x0f;
        const counts = Array.from(bytes.subarray(cursor + 1, cursor + 17));
        const total = counts.reduce((sum, count) => sum + count, 0);
        const values = Array.from(bytes.subarray(cursor + 17, cursor + 17 + total));
        if (tableClass === 0) dcTables.set(id, buildHuffmanTable(counts, values));
        cursor += 17 + total;
      }
    } else if (marker === MARKER_SOS) {
      if (lumaComponentId === null || lumaQuantTable === null) return null;
      // The first block in the data belongs to the first component in the
      // scan, which has to be luminance.
      if (bytes[start + 1] !== lumaComponentId) return null;
      const dcTable = dcTables.get(bytes[start + 2] >> 4);
      const quant = quantDc.get(lumaQuantTable);
      if (!dcTable || quant === undefined) return null;

      const dc = readFirstDc(bytes, end, dcTable);
      if (dc === null) return null;
      // DC = 8 x (mean - 128) / quantiser, for an 8x8 block.
      const mean = (dc * quant) / 8 + 128;
      return Math.min(255, Math.max(0, mean));
    }

    offset = end;
  }
  return null;
}

/** Decodes the first DC coefficient of the entropy-coded data at `start`. */
function readFirstDc(bytes: Uint8Array, start: number, table: HuffmanTable): number | null {
  let position = start;
  let current = 0;
  let bitsLeft = 0;

  const readBit = (): number | null => {
    if (bitsLeft === 0) {
      if (position >= bytes.length) return null;
      current = bytes[position];
      if (current === 0xff) {
        // 0xFF00 is a stuffed 0xFF data byte; anything else is a marker.
        if (bytes[position + 1] !== 0x00) return null;
        position += 1;
      }
      position += 1;
      bitsLeft = 8;
    }
    bitsLeft -= 1;
    return (current >> bitsLeft) & 1;
  };

  let code = 0;
  let category: number | null = null;
  for (let length = 1; length <= 16; length += 1) {
    const bit = readBit();
    if (bit === null) return null;
    code = (code << 1) | bit;
    if (table.maxCode[length] >= code && code >= table.minCode[length]) {
      category = table.values[table.valueOffset[length] + code - table.minCode[length]];
      break;
    }
  }
  if (category === null || category > 11) return null;
  if (category === 0) return 0;

  let value = 0;
  for (let index = 0; index < category; index += 1) {
    const bit = readBit();
    if (bit === null) return null;
    value = (value << 1) | bit;
  }
  // Values with a leading 0 bit are negative (JPEG "EXTEND").
  return value < 1 << (category - 1) ? value - (1 << category) + 1 : value;
}
