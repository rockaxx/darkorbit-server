using System;
using Ow.Game.Events;

internal static class CompetitiveRatingTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        var equal = CompetitiveRatingPolicy.Calculate(100, 100);
        Check(equal.WinnerRating == 150 && equal.LoserRating == 50,
            "equal players must exchange 50 Elo with K=100");

        var upset = CompetitiveRatingPolicy.Calculate(100, 300);
        Check(upset.WinnerRating == 176 && upset.LoserRating == 224,
            "an underdog win must exchange more Elo");

        var floor = CompetitiveRatingPolicy.Calculate(1000, 0);
        Check(floor.LoserRating == 0, "Elo must never fall below zero");

        Check(CompetitiveRatingPolicy.MatchRange(0) == 100, "initial matchmaking range must be 100");
        Check(CompetitiveRatingPolicy.MatchRange(20) == 200, "matchmaking range must widen while waiting");
        Check(CompetitiveRatingPolicy.MatchRange(999) == 1000, "matchmaking range must be capped");

        Check(CompetitiveRatingPolicy.TitleForRank(1) == "Best Player", "rank 1 title mismatch");
        Check(CompetitiveRatingPolicy.TitleForRank(2) == "2nd Best Player", "rank 2 title mismatch");
        Check(CompetitiveRatingPolicy.TitleForRank(3) == "3rd Best Player", "rank 3 title mismatch");
        Check(CompetitiveRatingPolicy.TitleForRank(4) == "", "players below top 3 must have no title");
        Check(CompetitiveRatingPolicy.TitleType("Best Player") == 0, "rank 1 title must use the visible legacy title type");
        Check(CompetitiveRatingPolicy.TitleType("2nd Best Player") == 0, "rank 2 title must use the visible legacy title type");
        Check(CompetitiveRatingPolicy.TitleType("3rd Best Player") == 0, "rank 3 title must use the visible legacy title type");
        Check(CompetitiveRatingPolicy.TitlePacket(7, "Best Player") == "0|n|t|7|0|Best Player",
            "competitive title packet must target the ship and use the client-supported title type");
        Check(CompetitiveRatingPolicy.TitlePacket(7, "") == "0|n|trm|7",
            "empty competitive title must remove the title below the ship");

        Console.WriteLine("PASS: competitive Elo and title policy.");
        return 0;
    }
}
