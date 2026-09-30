import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createReportSchema, idSchema } from "@/lib/validations";
import { createReport } from "@/lib/services/report-service";

/** POST /api/listings/:id/reports - Body: { reason, details? }. 201 -> "Your report has been received." */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = idSchema.parse((await params).id);
  const input = createReportSchema.parse(await readJson(req));
  return json(await createReport(user.id, id, input), 201);
});
