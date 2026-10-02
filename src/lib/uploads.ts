import { randomToken } from "@/lib/crypto";

// ponytail: photos are stored in Postgres (bytea, max 5 MB) so serverless hosts work with no
// extra service. Move to S3/R2 if photo volume grows.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Kind = { mime: string; ext: string };

/** Identify the image by its bytes, never by the browser-supplied name or MIME type. */
export function sniffImage(buf: Uint8Array): Kind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b)) {
    return { mime: "image/png", ext: "png" };
  }
  if (buf.length >= 12 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

function ascii(buf: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...buf.subarray(start, start + len));
}

/**
 * Removes EXIF/XMP/text metadata (which can hold GPS coordinates of a grandparent's home)
 * while leaving pixel data untouched. Unknown or malformed structure returns the input as-is.
 */
export function stripImageMetadata(buf: Buffer, mime: string): Buffer {
  try {
    if (mime === "image/jpeg") {
      const parts: Buffer[] = [buf.subarray(0, 2)];
      let i = 2;
      while (i + 4 <= buf.length && buf[i] === 0xff) {
        const marker = buf[i + 1];
        if (marker === 0xda) break; // start of scan: the rest is image data
        const len = buf.readUInt16BE(i + 2);
        const isMetadata = marker === 0xe1 || marker === 0xed || marker === 0xfe; // APP1 EXIF/XMP, APP13 IPTC, COM
        if (!isMetadata) parts.push(buf.subarray(i, i + 2 + len));
        i += 2 + len;
      }
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
    if (mime === "image/png") {
      const drop = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
      const parts: Buffer[] = [buf.subarray(0, 8)];
      let i = 8;
      while (i + 12 <= buf.length) {
        const len = buf.readUInt32BE(i);
        const type = buf.toString("latin1", i + 4, i + 8);
        const end = i + 12 + len;
        if (!drop.has(type)) parts.push(buf.subarray(i, end));
        i = end;
        if (type === "IEND") break;
      }
      return Buffer.concat(parts);
    }
    if (mime === "image/webp") {
      const parts: Buffer[] = [];
      let i = 12;
      while (i + 8 <= buf.length) {
        const type = buf.toString("latin1", i, i + 4);
        const len = buf.readUInt32LE(i + 4);
        const end = i + 8 + len + (len % 2);
        if (type !== "EXIF" && type !== "XMP ") parts.push(buf.subarray(i, end));
        i = end;
      }
      const body = Buffer.concat(parts);
      const header = Buffer.alloc(12);
      header.write("RIFF", 0, "latin1");
      header.writeUInt32LE(body.length + 4, 4);
      header.write("WEBP", 8, "latin1");
      return Buffer.concat([header, body]);
    }
  } catch {
    return buf;
  }
  return buf;
}

export type PreparedImage = { storageKey: string; mimeType: string; sizeBytes: number; data: Uint8Array<ArrayBuffer> };

/** Validates and cleans an uploaded photo. The caller stores the bytes (in Postgres). */
export async function prepareImage(file: File): Promise<PreparedImage | { error: string }> {
  if (file.size === 0) return { error: "Please choose a photo." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "That photo is larger than 5 MB. Please choose a smaller one." };
  const raw = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(raw);
  if (!kind) return { error: "Please choose a JPEG, PNG or WebP photo." };
  const clean = stripImageMetadata(raw, kind.mime);
  return { storageKey: `${randomToken(18)}.${kind.ext}`, mimeType: kind.mime, sizeBytes: clean.length, data: new Uint8Array(clean) };
}
