using System;

namespace Ow.Game.Events
{
    static class DuelPolicy
    {
        public const int InviteLifetimeSeconds = 60;
        public const int CountdownSeconds = 25;
        public const int FirstArenaMapId = 101;
        public const int LastArenaMapId = 111;

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
    }
}
