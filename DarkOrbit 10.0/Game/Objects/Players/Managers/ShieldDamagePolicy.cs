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
            double shieldAbsorption, double shieldPenetration, bool crabFormation,
            bool attackerMothFormation)
        {
            damage = Math.Max(0, damage);
            currentShield = Math.Max(0, currentShield);

            if (crabFormation)
            {
                var shieldRatio = attackerMothFormation ? 0.8 : 1.0;
                var shieldDamage = Math.Min((int)(damage * shieldRatio), currentShield);
                return new ShieldDamageResult(shieldDamage, damage - shieldDamage);
            }

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
