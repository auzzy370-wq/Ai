import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import { uploadResume } from "@/server/candidates/service";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  return withHandler(async () => {
    const user = await requireUser(["CANDIDATE", "TEAM_MEMBER", "SUPER_ADMIN"]);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("file required", 400, "FILE_REQUIRED");
    const bytes = Buffer.from(await file.arrayBuffer());
    const resume = await uploadResume({
      userId: user.id,
      filename: file.name,
      mimeType: file.type || "application/pdf",
      bytes,
      actorId: user.id,
    });
    return jsonOk(resume, { status: 201 });
  });
}
