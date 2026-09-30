import { ApiError, badRequest, json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { UPLOADS } from "@/lib/constants";
import { saveImage } from "@/lib/services/upload-service";

/**
 * POST /api/uploads - multipart/form-data with a single "file" field.
 * 201 -> { url } - put that url in a listing's imageUrl.
 */
export const POST = route(async (req) => {
  await requireUser(req);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > UPLOADS.maxBytes + 64 * 1024) {
    throw new ApiError(413, "Images must be 2 MB or smaller.");
  }
  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    throw new ApiError(415, "Upload the image as multipart/form-data with a field named \"file\".");
  }

  const form = await req.formData().catch(() => {
    throw badRequest("Could not read the uploaded file.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Attach an image in a field named \"file\".");

  return json(await saveImage(file), 201);
});
