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
        Check(!DuelPolicy.ShouldRestrictMovement(),
            "original 1v1 arena must not teleport or clamp moving players");
        Check(!DuelPolicy.CanUseShipAbility(true), "ship abilities must be blocked in a duel");
        Check(DuelPolicy.CanUseShipAbility(false), "ship abilities must work outside a duel");
        Check(DuelPolicy.CanUsePet(true), "PET must be available in a duel");
        Check(!DuelPolicy.ShouldShowArenaOverlay(), "duel boundary must not paint a solid yellow arena background");

        Check(PetDamagePolicy.EffectiveDamage(5000, false) == 5000, "PET base damage must be retained");
        Check(PetDamagePolicy.EffectiveDamage(5000, true) == 0, "invulnerable target must take no PET damage");
        Check(PetDamagePolicy.EffectiveDamage(5000, false) == 5000, "blocked attack must not mutate later PET damage");
        Check(PetDamagePolicy.ScaleShield(25000, 50000, 200000) == 100000, "PET shield ratio must survive config changes");
        Check(PetDamagePolicy.ScaleShield(50000, 50000, 200000) == 200000, "full PET shield must remain full");
        var petShieldOnly = PetDamagePolicy.SplitDamage(5000, 10000);
        Check(petShieldOnly.Shield == 5000 && petShieldOnly.Hitpoints == 0,
            "PET laser must damage shield before hitpoints");
        var petOverflow = PetDamagePolicy.SplitDamage(5000, 3000);
        Check(petOverflow.Shield == 3000 && petOverflow.Hitpoints == 2000,
            "PET laser damage above the remaining shield must overflow to hitpoints");
        var petHpOnly = PetDamagePolicy.SplitDamage(5000, 0);
        Check(petHpOnly.Shield == 0 && petHpOnly.Hitpoints == 5000,
            "PET laser must damage hitpoints after shields are depleted");
        Check(LaserAmmunitionPolicy.ApplyDamage(5000, AmmunitionManager.LCB_10) == 5000, "PET x1 damage mismatch");
        Check(LaserAmmunitionPolicy.ApplyDamage(5000, AmmunitionManager.MCB_25) == 10000, "PET x2 damage mismatch");
        Check(LaserAmmunitionPolicy.ApplyDamage(5000, AmmunitionManager.MCB_50) == 15000, "PET x3 damage mismatch");
        Check(LaserAmmunitionPolicy.ApplyDamage(5000, AmmunitionManager.UCB_100) == 20000, "PET x4 damage mismatch");
        Check(LaserAmmunitionPolicy.ApplyDamage(5000, AmmunitionManager.RSB_75) == 25000, "PET RSB damage mismatch");
        Check(LaserAmmunitionPolicy.ApplyDamage(5000, AmmunitionManager.SAB_50) == 10000, "PET SAB damage mismatch");
        Check(LaserAmmunitionPolicy.ApplyDamage(10000, AmmunitionManager.CBO_100) == 30000,
            "CBO damage must remain x3");
        Check(LaserAmmunitionPolicy.GetShieldRestore(10000, AmmunitionManager.CBO_100) == 6500,
            "CBO shield restore must be x0.65 of base laser damage");
        Check(LaserAmmunitionPolicy.GetShieldRestore(10000, AmmunitionManager.UCB_100) == 0,
            "non-CBO ammunition must not receive CBO shield restore");
        Check(RocketEffectPolicy.IsEffectRocket(10), "DCR-250 must execute its slow-effect branch");
        Check(!RocketEffectPolicy.IsEffectRocket(1), "normal damage rockets must stay outside the effect branch");

        Check(AmmunitionVisibilityPolicy.IsLaserVisible(AmmunitionVisibilityPolicy.Cbo100), "CBO-100 must be visible to every player rank");
        Check(EliteBoosterPolicy.RequiredShieldBoosterTypes().Length == 2, "both shield boosters must be required");
        Check(EliteBoosterPolicy.RequiredShieldBoosterTypes()[0] == 15 && EliteBoosterPolicy.RequiredShieldBoosterTypes()[1] == 16, "required shield boosters must be SHD-B01 and SHD-B02");

        Console.WriteLine("PASS: gameplay expansion policies.");
        return 0;
    }
}
