using System;

namespace Ow.Game.Objects.Players.Managers
{
    static class PetKamikazePolicy
    {
        public const int Damage = 25000;
        public const int BlastRadius = 300;
        public const int TriggerPercent = 20;
        public static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(30);

        public static bool ShouldTrigger(bool armed, bool activated, bool inCombat,
            int ownerHitpoints, int ownerMaxHitpoints, int petHitpoints, int petMaxHitpoints,
            DateTime now, DateTime cooldownUntil)
        {
            if (!armed || !activated || !inCombat || now < cooldownUntil) return false;
            return IsLowHealth(ownerHitpoints, ownerMaxHitpoints) || IsLowHealth(petHitpoints, petMaxHitpoints);
        }

        public static bool IsInBlastRadius(double distance)
        {
            return distance <= BlastRadius;
        }

        private static bool IsLowHealth(int hitpoints, int maxHitpoints)
        {
            return maxHitpoints > 0 && hitpoints * 100L <= maxHitpoints * TriggerPercent;
        }
    }
}
