import { jsonOk, withHandler } from "@/server/auth/api";
import { requireUser } from "@/server/auth/session";
import {
  aiLeaderboard,
  humanLeaderboard,
  humanViewerStanding,
  teamLeaderboard,
  teamViewerStanding,
} from "@/server/competition/leaderboards";

export async function GET(req: Request) {
  return withHandler(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const tab = url.searchParams.get("tab") || "human";
    const windowDays = url.searchParams.get("window")
      ? Number(url.searchParams.get("window"))
      : undefined;
    const boardTake = 50;

    if (tab === "ai") {
      return jsonOk({
        tab,
        rows: await aiLeaderboard({ take: boardTake }),
        me: null,
        scoringNotes:
          "AI accuracy from completed benchmark runs; mocked runs marked experimental. Personal rank does not apply to model boards.",
      });
    }
    if (tab === "team") {
      const rows = await teamLeaderboard({ take: boardTake });
      const me = await teamViewerStanding(user.id, { boardTake });
      return jsonOk({
        tab,
        rows,
        me,
        scoringNotes:
          "Team average from scored assessment reports. Your team rank is shown privately when you are a member.",
      });
    }

    const rows = await humanLeaderboard({ windowDays, take: boardTake });
    const me = await humanViewerStanding(user.id, { windowDays, boardTake });
    return jsonOk({
      tab: "human",
      rows,
      me,
      scoringNotes:
        "Contest score desc, then penalty asc. Completions counted separately. Your rank is always shown to you, even outside the top board.",
    });
  });
}
