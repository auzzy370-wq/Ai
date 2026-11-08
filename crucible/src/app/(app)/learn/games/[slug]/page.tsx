import Link from "next/link";
import { notFound } from "next/navigation";
import { CANDIDATE_ROLES } from "@/lib/access";
import { requirePageRolesOrGuest } from "@/server/auth/page-guard";
import { getArcadeGame } from "@/server/learning/arcade-games";
import { Badge } from "@/components/ui/badge";
import { FrameworkFlowGame } from "@/components/learn/games/framework-flow-game";
import { BigOBlitzGame } from "@/components/learn/games/big-o-blitz-game";
import { PairSeekerGame } from "@/components/learn/games/pair-seeker-game";
import { BinaryRangeGame } from "@/components/learn/games/binary-range-game";

export default async function ArcadeGamePage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePageRolesOrGuest("/learn/games", CANDIDATE_ROLES);
  const { slug } = await params;
  const game = getArcadeGame(slug);
  if (!game) notFound();

  const play =
    slug === "framework-flow" ? (
      <FrameworkFlowGame />
    ) : slug === "big-o-blitz" ? (
      <BigOBlitzGame />
    ) : slug === "pair-seeker" ? (
      <PairSeekerGame />
    ) : (
      <BinaryRangeGame />
    );

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/learn/games" className="text-[var(--brand)] hover:underline">
          ← Arcade
        </Link>
        <span className="text-slate-500">/</span>
        <span className="text-slate-600">{game.title}</span>
      </div>

      <header>
        <div className="flex flex-wrap gap-2">
          <Badge variant="brand">{game.skill}</Badge>
          <Badge>{game.minutes} min</Badge>
          <Badge variant="amber">D{game.difficulty}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{game.title}</h1>
        <p className="mt-2 text-slate-600">{game.blurb}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-6">
        {play}
      </section>
    </div>
  );
}
