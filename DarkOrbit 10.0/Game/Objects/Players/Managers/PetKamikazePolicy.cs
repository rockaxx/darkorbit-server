using System;

namespace Ow.Game.Objects.Players.Managers
{
    static class PetKamikazePolicy
    {
        public const int Damage = 150000;
        public const int BlastRadius = 75;
        public const int TriggerPercent = 20;
        public static readonly TimeSpan Cooldown = TimeSpan.FromSeconds(25);

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

        public static bool ShouldPursue(bool armed, bool activated, bool inCombat,
            int ownerHitpoints, int ownerMaxHitpoints, int petHitpoints, int petMaxHitpoints,
            bool hasValidTarget, DateTime now, DateTime cooldownUntil)
        {
            return armed && activated && hasValidTarget && now >= cooldownUntil;
        }

        public static bool ShouldDetonate(bool pursuing, double distance)
        {
            return pursuing && IsInBlastRadius(distance);
        }

        public static int ActivationHitpoints(int currentHitpoints, int maxHitpoints)
        {
            return Math.Max(0, Math.Min(currentHitpoints, maxHitpoints));
        }

        private static bool IsLowHealth(int hitpoints, int maxHitpoints)
        {
            return maxHitpoints > 0 && hitpoints * 100L <= maxHitpoints * TriggerPercent;
        }
    }
}
