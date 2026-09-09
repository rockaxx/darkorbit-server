using System;

namespace Ow.Game.Objects.Players.Managers
{
    internal static class RepairBotPolicy
    {
        public static bool CanRepair(bool destroyed, int currentHp, int maxHp, DateTime lastCombat, DateTime now)
        {
            return !destroyed && currentHp < maxHp && lastCombat.AddSeconds(10) <= now;
        }
    }
}
