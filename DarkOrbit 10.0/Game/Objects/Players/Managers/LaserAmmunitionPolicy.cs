namespace Ow.Game.Objects.Players.Managers
{
    static class LaserAmmunitionPolicy
    {
        public static int ApplyDamage(int baseDamage, string ammunition)
        {
            return baseDamage * GetMultiplier(ammunition);
        }

        public static int GetMultiplier(string ammunition)
        {
            switch (ammunition)
            {
                case AmmunitionManager.MCB_25:
                case AmmunitionManager.SAB_50:
                    return 2;
                case AmmunitionManager.MCB_50:
                case AmmunitionManager.CBO_100:
                    return 3;
                case AmmunitionManager.UCB_100:
                    return 4;
                case AmmunitionManager.RSB_75:
                    return 5;
                default:
                    return 1;
            }
        }
    }
}
