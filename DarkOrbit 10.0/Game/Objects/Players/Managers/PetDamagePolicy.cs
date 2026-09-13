namespace Ow.Game.Objects.Players.Managers
{
    struct PetDamageResult
    {
        public int Shield;
        public int Hitpoints;

        public PetDamageResult(int shield, int hitpoints)
        {
            Shield = shield;
            Hitpoints = hitpoints;
        }
    }

    static class PetDamagePolicy
    {
        public static int EffectiveDamage(int baseDamage, bool targetProtected)
        {
            return targetProtected ? 0 : baseDamage;
        }

        public static int ScaleShield(int currentShield, int oldMaximum, int newMaximum)
        {
            if (newMaximum <= 0) return 0;
            if (oldMaximum <= 0) return newMaximum;
            var ratio = System.Math.Max(0, System.Math.Min(1, (double)currentShield / oldMaximum));
            return (int)System.Math.Round(newMaximum * ratio);
        }

        public static PetDamageResult SplitDamage(int damage, int currentShield)
        {
            damage = System.Math.Max(0, damage);
            currentShield = System.Math.Max(0, currentShield);
            var shieldDamage = System.Math.Min(damage, currentShield);
            return new PetDamageResult(shieldDamage, damage - shieldDamage);
        }
    }
}
