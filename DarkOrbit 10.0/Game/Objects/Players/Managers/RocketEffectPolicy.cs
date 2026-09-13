namespace Ow.Game.Objects.Players.Managers
{
    static class RocketEffectPolicy
    {
        public static bool IsEffectRocket(int rocketId)
        {
            return rocketId == 5 || rocketId == 6 || rocketId == 10 || rocketId == 18;
        }
    }
}
