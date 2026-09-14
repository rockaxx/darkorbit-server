using System;
using Ow.Game.Objects.Players.Managers;

internal static class GalaxyGateBadgePolicyTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        foreach (var warRank in new[] { 0, 1, 2, 7, 21 })
            Check(GalaxyGateBadgePolicy.ForPlayer(warRank) == 100,
                "every player must receive the Kronos crown badge");

        Console.WriteLine("PASS: every player receives the Kronos crown badge.");
        return 0;
    }
}
