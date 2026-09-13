using System;

namespace Ow.Game.Events
{
    sealed class CompetitiveRatingResult
    {
        public int WinnerRating { get; private set; }
        public int LoserRating { get; private set; }

        public CompetitiveRatingResult(int winnerRating, int loserRating)
        {
            WinnerRating = winnerRating;
            LoserRating = loserRating;
        }
    }

    static class CompetitiveRatingPolicy
    {
        public const int DefaultRating = 100;
        public const int KFactor = 100;

        public static CompetitiveRatingResult Calculate(int winnerRating, int loserRating)
        {
            winnerRating = Math.Max(0, winnerRating);
            loserRating = Math.Max(0, loserRating);
            var expectedWinner = 1.0 / (1.0 + Math.Pow(10.0, (loserRating - winnerRating) / 400.0));
            var exchange = (int)Math.Round(KFactor * (1.0 - expectedWinner), MidpointRounding.AwayFromZero);
            return new CompetitiveRatingResult(winnerRating + exchange, Math.Max(0, loserRating - exchange));
        }

        public static int MatchRange(int waitingSeconds)
        {
            return Math.Min(1000, 100 + Math.Max(0, waitingSeconds) / 10 * 50);
        }

        public static string TitleForRank(int rank)
        {
            if (rank == 1) return "Best Player";
            if (rank == 2) return "2nd Best Player";
            if (rank == 3) return "3rd Best Player";
            return "";
        }

        public static short TitleType(string title)
        {
            return 0;
        }

        public static string TitlePacket(int playerId, string title)
        {
            return string.IsNullOrEmpty(title)
                ? string.Format("0|n|trm|{0}", playerId)
                : string.Format("0|n|t|{0}|{1}|{2}", playerId, TitleType(title), title);
        }

        public static bool IsCompetitiveTitle(string title)
        {
            return title == "Best Player" || title == "2nd Best Player" || title == "3rd Best Player";
        }
    }
}
