import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

// GET /api/stats/leaderboard
export function useLeaderboard() {
  return useQuery({
    queryKey: [api.stats.leaderboard.path],
    queryFn: async () => {
      const res = await fetch(api.stats.leaderboard.path);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return api.stats.leaderboard.responses[200].parse(await res.json());
    },
  });
}
