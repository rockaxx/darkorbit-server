using System;

namespace Ow.Game.Objects.Players.Managers
{
    internal struct ShieldDamageResult
    {
        public int Shield;
        public int Hitpoints;

        public ShieldDamageResult(int shield, int hitpoints)
        {
            Shield = shield;
            Hitpoints = hitpoints;
        }
    }

    internal static class ShieldDamagePolicy
    {
        public static ShieldDamageResult Calculate(int damage, int currentShield,
            double shieldAbsorption, double shieldPenetration, bool crabFormation)
        {
            damage = Math.Max(0, damage);
            currentShield = Math.Max(0, currentShield);

            if (crabFormation)
                return currentShield > 0
                    ? new ShieldDamageResult(Math.Min(damage, currentShield), 0)
                    : new ShieldDamageResult(0, damage);

            var shieldAbsorb = Math.Abs(shieldAbsorption - shieldPenetration);
            shieldAbsorb = Math.Min(1, shieldAbsorb);
            if (currentShield >= damage)
            {
                var shieldDamage = (int)(damage * shieldAbsorb);
                return new ShieldDamageResult(shieldDamage, damage - shieldDamage);
            }

            var overflowDamage = damage - currentShield;
            return new ShieldDamageResult(currentShield,
                (int)(overflowDamage + currentShield * shieldAbsorb));
        }
    }
}
