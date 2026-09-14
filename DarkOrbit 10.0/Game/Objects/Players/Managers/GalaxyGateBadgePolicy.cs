namespace Ow.Game.Objects.Players.Managers
{
    internal static class GalaxyGateBadgePolicy
    {
        public const int KronosCrown = 100;

        public static int ForPlayer(int warRank)
        {
            return KronosCrown;
        }
    }
}
