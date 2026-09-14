using System;
using System.Collections.Generic;
using Ow.Game.Objects.Players.Managers;

internal static class HonorRankPolicyTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        var ranks = HonorRankPolicy.Calculate(new[]
        {
            new HonorRankCandidate(7, 1500, 1),
            new HonorRankCandidate(3, 900, 1),
            new HonorRankCandidate(4, 900, 1),
            new HonorRankCandidate(8, 100, 1),
            new HonorRankCandidate(1, 999999, 21),
            new HonorRankCandidate(2, 999998, 22)
        });

        Check(ranks[7] == 20, "highest honor must receive General");
        Check(ranks[3] == 19 && ranks[4] == 19, "equal honor must receive the same rank");
        Check(ranks[8] == 18, "the next distinct honor must receive the next lower rank");
        Check(!ranks.ContainsKey(1) && !ranks.ContainsKey(2), "special ranks 21 and 22 must be preserved");
        Check(HonorRankPolicy.RankForDistinctPlace(20) == 1, "twentieth honor tier must receive rank 1");
        Check(HonorRankPolicy.RankForDistinctPlace(50) == 1, "rank must never fall below rank 1");

        Console.WriteLine("PASS: honor leaderboard rank policy.");
        return 0;
    }
}
