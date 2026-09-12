namespace Ow.Game.Objects.Players.Managers
{
    public static class AmmunitionVisibilityPolicy
    {
        public const string Cbo100 = "ammunition_laser_cbo-100";

        public static bool IsLaserVisible(string itemLootId)
        {
            return !string.IsNullOrEmpty(itemLootId);
        }
    }
}
