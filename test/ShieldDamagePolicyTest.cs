using System;
using Ow.Game.Objects.Players.Managers;

internal static class ShieldDamagePolicyTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        var normal = ShieldDamagePolicy.Calculate(1000, 5000, 0.8, 0.1, false);
        Check(normal.Shield == 700 && normal.Hitpoints == 300,
            "normal formations must retain shield penetration");

        var crab = ShieldDamagePolicy.Calculate(1000, 5000, 1.0, 0.4, true);
        Check(crab.Shield == 800 && crab.Hitpoints == 200,
            "Crab must absorb 80 percent, allowing 20 percent into HP");

        var crabOverflow = ShieldDamagePolicy.Calculate(1000, 200, 1.0, 0.4, true);
        Check(crabOverflow.Shield == 200 && crabOverflow.Hitpoints == 800,
            "damage exceeding the remaining Crab shield must reach HP");

        var crabWithoutShield = ShieldDamagePolicy.Calculate(1000, 0, 1.0, 0.4, true);
        Check(crabWithoutShield.Shield == 0 && crabWithoutShield.Hitpoints == 1000,
            "attacks after Crab shield reaches zero must damage HP");

        Console.WriteLine("PASS: Crab shield damage policy.");
        return 0;
    }
}
