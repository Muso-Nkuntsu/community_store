import { json, readJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminUpdateReportSchema, idSchema } from "@/lib/validations";
import { getReport, updateReport } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/admin/reports/:id - report detail with reporter and listing. */
export const GET = route<Params>(async (req, { params }) => {
  await requireAdmin(req);
  const id = idSchema.parse((await params).id);
  return json(await getReport(id));
});

/**
 * PATCH /api/admin/reports/:id
 * Body: { status: "REVIEWED" | "DISMISSED" | "ACTION_TAKEN", resolutionNote?,
 *         removeListing?: boolean, removalReason?: string }
 * removeListing=true requires status ACTION_TAKEN and a removalReason.
 */
export const PATCH = route<Params>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = idSchema.parse((await params).id);
  const input = adminUpdateReportSchema.parse(await readJson(req));
  const result = await updateReport(admin.id, id, input);
  return json({ ...result, message: "Report updated." });
});
