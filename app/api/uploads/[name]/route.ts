import { route } from "@/lib/api";
import { readImage } from "@/lib/services/upload-service";

/** GET /api/uploads/:name - serves an uploaded listing image. */
export const GET = route<{ name: string }>(async (_req, { params }) => {
  const { data, mime } = await readImage((await params).name);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
});
