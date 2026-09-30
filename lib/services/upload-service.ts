import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError, badRequest, notFound } from "@/lib/api";
import { UPLOADS } from "@/lib/constants";

/**
 * Optional image uploads, kept deliberately simple: files go to
 * storage/uploads on the server's disk and are served by GET /api/uploads/:name.
 *
 * - Only JPEG, PNG and WebP are accepted, checked by the file's actual bytes
 *   (magic numbers), not by its name or the browser-supplied type.
 * - Max 2 MB.
 * - Files are renamed to a random hex name, so user-supplied names never touch the disk.
 *
 * For a hosted deployment with no persistent disk, swap this module for a
 * cloud bucket; listings only store the resulting URL.
 */

type ImageType = { ext: "jpg" | "png" | "webp"; mime: string };

function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const FILE_NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

function uploadDir() {
  return path.join(process.cwd(), UPLOADS.dir);
}

export async function saveImage(file: File): Promise<{ url: string; bytes: number; type: string }> {
  if (file.size === 0) throw badRequest("The file is empty.");
  if (file.size > UPLOADS.maxBytes) {
    throw new ApiError(413, `Images must be ${UPLOADS.maxBytes / 1024 / 1024} MB or smaller.`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(buf);
  if (!type) throw new ApiError(415, "Only JPEG, PNG or WebP images are allowed.");

  const name = `${crypto.randomBytes(16).toString("hex")}.${type.ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), buf, { flag: "wx" });

  return { url: `${UPLOADS.publicPrefix}${name}`, bytes: buf.length, type: type.mime };
}

export async function readImage(name: string): Promise<{ data: Buffer; mime: string }> {
  // Strict whitelist - blocks path traversal like ../../.env
  if (!FILE_NAME.test(name)) throw notFound("Image not found.");
  try {
    const data = await readFile(path.join(uploadDir(), name));
    return { data, mime: MIME_BY_EXT[name.split(".").pop()!]! };
  } catch {
    throw notFound("Image not found.");
  }
}
