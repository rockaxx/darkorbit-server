using System;

namespace Ow.Game.Events
{
    static class DuelPolicy
    {
        public const int InviteLifetimeSeconds = 60;
        public const int CountdownSeconds = 25;
        public const int FirstArenaMapId = 101;
        public const int LastArenaMapId = 111;
        public const int ArenaMinX = 2500;
        public const int ArenaMaxX = 7500;
        public const int ArenaMinY = 1200;
        public const int ArenaMaxY = 5200;

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

        public static bool IsInsideArena(int x, int y)
        {
            return x >= ArenaMinX && x <= ArenaMaxX && y >= ArenaMinY && y <= ArenaMaxY;
        }

        public static int ClampArenaX(int x)
        {
            return Math.Max(ArenaMinX, Math.Min(ArenaMaxX, x));
        }

        public static int ClampArenaY(int y)
        {
            return Math.Max(ArenaMinY, Math.Min(ArenaMaxY, y));
        }

        public static bool CanUseShipAbility(bool inDuel) { return !inDuel; }

        public static bool CanUsePet(bool inDuel) { return true; }
    }
}
