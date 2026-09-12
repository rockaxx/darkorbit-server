namespace Ow.Game.Objects.Players.Managers
{
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
    }
}
