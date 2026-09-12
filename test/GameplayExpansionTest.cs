using System;
using Ow.Game.Events;
using Ow.Game.Objects.Players.Managers;

internal static class GameplayExpansionTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        Check(DuelPolicy.IsInsideArena(2500, 1200), "top-left arena edge must be inside");
        Check(DuelPolicy.IsInsideArena(7500, 5200), "bottom-right arena edge must be inside");
        Check(!DuelPolicy.IsInsideArena(2499, 3200), "arena must reject the left outside area");
        Check(!DuelPolicy.IsInsideArena(5000, 5201), "arena must reject the bottom outside area");
        Check(DuelPolicy.ClampArenaX(100) == 2500 && DuelPolicy.ClampArenaX(9000) == 7500, "arena X clamp mismatch");
        Check(DuelPolicy.ClampArenaY(100) == 1200 && DuelPolicy.ClampArenaY(9000) == 5200, "arena Y clamp mismatch");
        Check(!DuelPolicy.CanUseShipAbility(true), "ship abilities must be blocked in a duel");
        Check(DuelPolicy.CanUseShipAbility(false), "ship abilities must work outside a duel");
        Check(DuelPolicy.CanUsePet(true), "PET must be available in a duel");

        Check(PetDamagePolicy.EffectiveDamage(5000, false) == 5000, "PET base damage must be retained");
        Check(PetDamagePolicy.EffectiveDamage(5000, true) == 0, "invulnerable target must take no PET damage");
        Check(PetDamagePolicy.EffectiveDamage(5000, false) == 5000, "blocked attack must not mutate later PET damage");
        Check(PetDamagePolicy.ScaleShield(25000, 50000, 200000) == 100000, "PET shield ratio must survive config changes");
        Check(PetDamagePolicy.ScaleShield(50000, 50000, 200000) == 200000, "full PET shield must remain full");

        Check(AmmunitionVisibilityPolicy.IsLaserVisible(AmmunitionVisibilityPolicy.Cbo100), "CBO-100 must be visible to every player rank");
        Check(EliteBoosterPolicy.RequiredShieldBoosterTypes().Length == 2, "both shield boosters must be required");
        Check(EliteBoosterPolicy.RequiredShieldBoosterTypes()[0] == 15 && EliteBoosterPolicy.RequiredShieldBoosterTypes()[1] == 16, "required shield boosters must be SHD-B01 and SHD-B02");

        Console.WriteLine("PASS: gameplay expansion policies.");
        return 0;
    }
}
