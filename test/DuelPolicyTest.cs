using System;
using Ow.Game.Events;

internal static class DuelPolicyTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        Check(DuelPolicy.CanInvite(1, 2, true, true, false, false), "available online players should duel");
        Check(!DuelPolicy.CanInvite(1, 1, true, true, false, false), "self invite must fail");
        Check(!DuelPolicy.CanInvite(1, 2, true, false, false, false), "offline target must fail");
        Check(!DuelPolicy.CanInvite(1, 2, true, true, true, false), "busy inviter must fail");
        Check(!DuelPolicy.CanInvite(1, 2, true, true, false, true), "busy target must fail");
        var created = new DateTime(2026, 9, 11, 12, 0, 0, DateTimeKind.Utc);
        Check(!DuelPolicy.IsExpired(created, created.AddSeconds(59)), "invite expires too early");
        Check(DuelPolicy.IsExpired(created, created.AddSeconds(60)), "invite must expire at 60 seconds");
        Check(DuelPolicy.IsArenaMapId(101) && DuelPolicy.IsArenaMapId(111), "arena pool boundary missing");
        Check(!DuelPolicy.IsArenaMapId(100) && !DuelPolicy.IsArenaMapId(112), "arena pool leaked");
        Console.WriteLine("PASS: 1v1 duel invitation policy.");
        return 0;
    }
}
