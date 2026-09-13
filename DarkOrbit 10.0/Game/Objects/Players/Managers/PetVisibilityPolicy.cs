namespace Ow.Game.Objects.Players.Managers
{
    static class PetVisibilityPolicy
    {
        public const int SynchronizationRange = 2000;

        public static bool ShouldSynchronize(bool activated, bool destroyed, bool sameMap, double distance,
            bool duelParticipant = false)
        {
            return activated && !destroyed && sameMap &&
                (duelParticipant || distance <= SynchronizationRange);
        }

        public static string VisibilityPacket(int petId, bool invisible)
        {
            return string.Format("0|n|INV|{0}|{1}", petId, invisible ? 1 : 0);
        }

        public static bool ShouldActivateForDuel(bool hasPet, bool activated, bool destroyed)
        {
            return hasPet && !activated && !destroyed;
        }

        public static bool ShouldForceRecreateAfterArenaLoad(bool activated, bool destroyed, bool sameMap)
        {
            return activated && !destroyed && sameMap;
        }
    }
}
