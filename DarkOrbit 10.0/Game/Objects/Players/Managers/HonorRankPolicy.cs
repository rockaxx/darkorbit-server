using System;
using System.Collections.Generic;
using System.Linq;

namespace Ow.Game.Objects.Players.Managers
{
    internal struct HonorRankCandidate
    {
        public int UserId { get; private set; }
        public long Honor { get; private set; }
        public int CurrentRankId { get; private set; }

        public HonorRankCandidate(int userId, long honor, int currentRankId) : this()
        {
            UserId = userId;
            Honor = honor;
            CurrentRankId = currentRankId;
        }
    }

    internal static class HonorRankPolicy
    {
        public static Dictionary<int, int> Calculate(IEnumerable<HonorRankCandidate> candidates)
        {
            var result = new Dictionary<int, int>();
            var orderedCandidates = candidates
                .Where(candidate => candidate.CurrentRankId != 21 && candidate.CurrentRankId != 22)
                .OrderByDescending(candidate => candidate.Honor)
                .ThenBy(candidate => candidate.UserId);

            var distinctPlace = 0;
            long? previousHonor = null;

            foreach (var candidate in orderedCandidates)
            {
                if (!previousHonor.HasValue || previousHonor.Value != candidate.Honor)
                {
                    distinctPlace++;
                    previousHonor = candidate.Honor;
                }

                result[candidate.UserId] = RankForDistinctPlace(distinctPlace);
            }

            return result;
        }

        public static int RankForDistinctPlace(int distinctPlace)
        {
            return Math.Max(1, 21 - Math.Max(1, distinctPlace));
        }
    }
}
