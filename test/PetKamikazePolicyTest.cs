using System;
using Ow.Game.Objects.Players.Managers;

internal static class PetKamikazePolicyTest
{
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static int Main()
    {
        var now = new DateTime(2026, 9, 11, 10, 0, 0, DateTimeKind.Utc);
        Check(PetKamikazePolicy.ShouldTrigger(true, true, true, 10000, 50000, 50000, 50000, now, now), "20% owner HP must trigger");
        Check(PetKamikazePolicy.ShouldTrigger(true, true, true, 50000, 50000, 10000, 50000, now, now), "20% PET HP must trigger");
        Check(!PetKamikazePolicy.ShouldTrigger(true, true, true, 10001, 50000, 50000, 50000, now, now), "above threshold must wait");
        Check(!PetKamikazePolicy.ShouldTrigger(false, true, true, 1, 50000, 1, 50000, now, now), "unarmed must not trigger");
        Check(!PetKamikazePolicy.ShouldTrigger(true, true, false, 1, 50000, 1, 50000, now, now), "idle low-health PET must not explode immediately");
        Check(!PetKamikazePolicy.ShouldTrigger(true, true, true, 1, 50000, 1, 50000, now, now.AddSeconds(1)), "cooldown must block");
        Check(PetKamikazePolicy.IsInBlastRadius(300), "radius boundary must hit");
        Check(!PetKamikazePolicy.IsInBlastRadius(301), "outside radius must not hit");
        Check(PetKamikazePolicy.Damage == 25000, "G-KK1 damage mismatch");
        Check(PetKamikazePolicy.Cooldown == TimeSpan.FromSeconds(30), "cooldown mismatch");
        Console.WriteLine("PASS: PET Kamikaze policy.");
        return 0;
    }
}
