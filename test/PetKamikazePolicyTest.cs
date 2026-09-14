using System;
using Ow.Game.Objects.Players.Managers;
using Ow.Net.netty.commands;
using Ow.Utils;

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
        Check(PetKamikazePolicy.ShouldPursue(true, true, false, 50000, 50000, 50000, 50000, true, now, now),
            "selecting kamikaze must immediately pursue a valid enemy");
        Check(!PetKamikazePolicy.ShouldPursue(true, true, true, 50000, 50000, 50000, 50000, false, now, now),
            "PET must not start a kamikaze run without a valid enemy");
        Check(!PetKamikazePolicy.ShouldDetonate(true, 76), "PET must not explode before reaching the enemy closely");
        Check(PetKamikazePolicy.ShouldDetonate(true, 75), "PET must explode only at the close-range boundary");
        Check(PetKamikazePolicy.ActivationHitpoints(2500, 50000) == 2500,
            "normal PET reactivation must preserve damage instead of healing for free");
        Check(PetKamikazePolicy.ActivationHitpoints(60000, 50000) == 50000,
            "PET activation hitpoints must be capped at maximum");
        Check(PetKamikazePolicy.IsInBlastRadius(75), "close-range boundary must hit");
        Check(!PetKamikazePolicy.IsInBlastRadius(76), "outside close range must not hit");
        Check(PetKamikazePolicy.BlastRadius == 75, "G-KK1 must reach the target before exploding");
        Check(PetKamikazePolicy.Damage == 150000, "G-KK1 must deal 150000 damage");
        Check(PetKamikazePolicy.Cooldown == TimeSpan.FromSeconds(25), "G-KK1 cooldown must be 25 seconds");
        Check(PetVisibilityPolicy.ShouldSynchronize(true, false, true, 0), "active PET must synchronize to its owner after a map jump");
        Check(PetVisibilityPolicy.ShouldSynchronize(true, false, true, 1999), "nearby players must receive the PET create command");
        Check(!PetVisibilityPolicy.ShouldSynchronize(true, false, true, 2001), "out-of-range players must not receive the PET create command");
        Check(PetVisibilityPolicy.ShouldSynchronize(true, false, true, 2700, true),
            "both duel participants must receive PET create commands at their starting distance");
        Check(!PetVisibilityPolicy.ShouldSynchronize(false, false, true, 0), "inactive PET must stay hidden");
        Check(!PetVisibilityPolicy.ShouldSynchronize(true, true, true, 0), "destroyed PET must stay hidden");
        Check(!PetVisibilityPolicy.ShouldSynchronize(true, false, false, 0), "PET must not synchronize across maps");
        Check(PetVisibilityPolicy.VisibilityPacket(991, false) == "0|n|INV|991|0",
            "PET create must be followed by an explicit visible-state packet");
        Check(PetVisibilityPolicy.ShouldActivateForDuel(true, false, false),
            "an available inactive PET must automatically activate after the arena jump");
        Check(!PetVisibilityPolicy.ShouldActivateForDuel(true, true, false),
            "an already active PET must only be resynchronized");
        Check(!PetVisibilityPolicy.ShouldActivateForDuel(true, false, true),
            "a destroyed PET must not be revived for free");
        Check(!PetVisibilityPolicy.ShouldActivateForDuel(false, false, false),
            "a player without a PET must not trigger activation");
        Check(PetVisibilityPolicy.ShouldForceRecreateAfterArenaLoad(true, false, true),
            "an active healthy PET on the arena map must be recreated after map loading");
        Check(!PetVisibilityPolicy.ShouldForceRecreateAfterArenaLoad(false, false, true),
            "an inactive PET must not be recreated after arena loading");
        Check(!PetVisibilityPolicy.ShouldForceRecreateAfterArenaLoad(true, true, true),
            "a destroyed PET must not be recreated after arena loading");
        Check(!PetVisibilityPolicy.ShouldForceRecreateAfterArenaLoad(true, false, false),
            "a PET from another map must not be recreated in the arena client");

        var visiblePacket = PetVisibilityCommand.write(991, false);
        var parser = new ByteParser(visiblePacket);
        Check(parser.ID == PetVisibilityCommand.ID, "PET visibility command ID must match the Flash client");
        Check(parser.readShort() == -30289 && parser.readShort() == -5379,
            "PET visibility command guards must match the Flash client");
        var encodedPetId = parser.readInt();
        var decodedPetId = encodedPetId >> 11 | encodedPetId << 21;
        Check(decodedPetId == 991, "PET visibility command must encode a decodable PET id");
        Check(!parser.readBoolean(), "false must make the PET visible in the Flash client");
        Console.WriteLine("PASS: PET Kamikaze policy.");
        return 0;
    }
}
