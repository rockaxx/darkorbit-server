using System;

namespace Ow.Game.Events
{
    static class DuelPolicy
    {
        public const int InviteLifetimeSeconds = 60;
        public const int CountdownSeconds = 25;
        public const int FirstArenaMapId = 121;
        public const int LastArenaMapId = 121;
        public const int FirstSpawnX = 4400;
        public const int FirstSpawnY = 3600;
        public const int SecondSpawnX = 5600;
        public const int SecondSpawnY = 2400;
        public static readonly string[] SpawnBarrierPoiIds = { "uba_poi2", "uba_poi3" };

        public static bool CanInvite(int inviterId, int inviteeId, bool inviterOnline, bool inviteeOnline,
            bool inviterBusy, bool inviteeBusy)
        {
            return inviterId > 0 && inviteeId > 0 && inviterId != inviteeId &&
                inviterOnline && inviteeOnline && !inviterBusy && !inviteeBusy;
        }

        public static bool IsExpired(DateTime createdAt, DateTime now)
        {
            return now >= createdAt.AddSeconds(InviteLifetimeSeconds);
        }

        public static bool IsArenaMapId(int mapId)
        {
            return mapId >= FirstArenaMapId && mapId <= LastArenaMapId;
        }

        public static bool CanUseShipAbility(bool inDuel) { return !inDuel; }

        public static bool CanUsePet(bool inDuel) { return true; }

        public static bool ShouldShowArenaOverlay() { return false; }

        public static bool ShouldRestrictMovement() { return false; }
    }
}
