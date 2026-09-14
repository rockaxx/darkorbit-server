using System;
using System.Linq;
using Ow.Game;
using Ow.Game.Objects.Players.Managers;

internal static class PermanentBoosterPolicyTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        var all = PermanentBoosterPolicy.All();
        var defined = Enum.GetValues(typeof(BoosterType)).Cast<BoosterType>().ToArray();
        Check(all.Count == defined.Length, "every defined booster must be granted");
        foreach (var booster in defined)
        {
            Check(all.ContainsKey(booster), "missing permanent booster " + booster);
            Check(PermanentBoosterPolicy.Percentage(booster) > 0, "booster has no effect " + booster);
        }
        Check(all[BoosterType.RES_B01] == BoostedAttributeType.RESOURCE, "resource booster mapping mismatch");
        Check(all[BoosterType.SREG_B02] == BoostedAttributeType.SHIELDRECHARGE, "shield recharge mapping mismatch");
        Check(all[BoosterType.CD_B02] == BoostedAttributeType.ABILITY_COOLDOWN, "cooldown booster mapping mismatch");
        Check(all[BoosterType.BB_01] == BoostedAttributeType.BONUSBOXES, "bonus box booster mapping mismatch");
        Check(all[BoosterType.QR_01] == BoostedAttributeType.QUESTREWARD, "quest reward booster mapping mismatch");
        Check(PermanentBoosterPolicy.MaximumPercentage(BoostedAttributeType.DAMAGE) == 20,
            "total damage booster must be capped at exactly 20 percent");
        Console.WriteLine("PASS: every emulator booster has a permanent attribute mapping and effect.");
        return 0;
    }
}
