import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser, canReview, canManageCandidates } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CandidateProfilePanel } from "@/components/candidate/profile-panel";
import { buildProfileDossier } from "@/server/candidates/profile-dossier";
import { trackBadgeVariant, trackLabel } from "@/lib/tracks";

export default async function CandidatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "CANDIDATE" || user.role === "TEAM_MEMBER") {
    const dossier = await buildProfileDossier(user.id);
    return <CandidateProfilePanel key={dossier.profile.updatedAt.toString()} dossier={dossier} />;
  }

  if (!canManageCandidates(user.role) && !canReview(user.role)) {
    redirect("/dashboard");
  }

  const candidates = await prisma.user.findMany({
    where: { role: { in: ["CANDIDATE", "TEAM_MEMBER"] } },
    include: {
      candidateProfile: { include: { skills: true, resumes: { take: 1, orderBy: { uploadedAt: "desc" } } } },
      assignments: { include: { scoreReport: true, assessment: true }, take: 3, orderBy: { createdAt: "desc" } },
      streak: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-orange-700">CANDIDATES</p>
        <h1 className="mt-2 font-serif-display text-2xl sm:text-3xl">Profiles & evidence lanes</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Open a dossier to see verified skills, claimed résumé noise, and scored assessments.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {candidates.map((c) => {
          const verified =
            c.candidateProfile?.skills.filter((s) => s.source === "ASSESSMENT" || s.source === "HUMAN_REVIEW")
              .length ?? 0;
          const claimed = c.candidateProfile?.skills.filter((s) => s.source === "CLAIMED").length ?? 0;
          const scored = c.assignments.filter((a) => a.scoreReport).length;
          return (
            <article
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white/75 p-5 transition hover:border-orange-300/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-serif-display text-xl text-slate-900">{c.name}</h2>
                  <p className="text-sm text-slate-500">{c.email}</p>
                </div>
                {c.streak?.currentStreak ? (
                  <Badge variant="emerald">{c.streak.currentStreak}d streak</Badge>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={trackBadgeVariant(c.candidateProfile?.preferredTrack ?? "SOFTWARE_ENGINEERING")}>
                  {trackLabel(c.candidateProfile?.preferredTrack ?? "SOFTWARE_ENGINEERING")}
                </Badge>
                {(c.candidateProfile?.cybersecurity ?? []).slice(0, 3).map((s) => (
                  <Badge key={s} variant="violet">
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-slate-200 px-2 py-2">
                  <div className="font-serif-display text-lg text-slate-900">{verified}</div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">Verified</div>
                </div>
                <div className="rounded-lg border border-slate-200 px-2 py-2">
                  <div className="font-serif-display text-lg text-slate-900">{claimed}</div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">Claimed</div>
                </div>
                <div className="rounded-lg border border-slate-200 px-2 py-2">
                  <div className="font-serif-display text-lg text-slate-900">{scored}</div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">Scored</div>
                </div>
              </div>
              <Link className="mt-4 inline-block text-sm text-orange-700 hover:underline" href={`/candidates/${c.id}`}>
                Open dossier →
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
