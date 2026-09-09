using System;
using Ow.Game.Objects.Players;
using Ow.Game.Objects.Players.Managers;
using Ow.Game.Events;
using Ow.Game.Ticks;

namespace Ow.Utils
{
    static class Logger
    {
        public static int Calls;
        public static void Log(string fileName, string message) { Calls++; }
    }
}

class GameplayReliabilityTest
{
    sealed class ThrowingTick : Tick
    {
        public void Tick() { throw new InvalidOperationException("expected test failure"); }
    }

    sealed class CountingTick : Tick
    {
        public int Calls;
        public void Tick() { Calls++; }
    }

    static void Assert(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    static void Main()
    {
        var manager = new TickManager();
        var healthy = new CountingTick();
        manager.AddTick(new ThrowingTick());
        manager.AddTick(healthy);
        manager.RunFrame();
        manager.RunFrame();
        Assert(healthy.Calls == 2, "A throwing tick stopped later ticks or the next frame.");
        Assert(Ow.Utils.Logger.Calls == 2, "Each failed tick must be logged once per frame.");

        Assert(
            PlayerKillLog.CreateInsert(7, 9, true) ==
            "INSERT INTO log_player_kills (killer_id, target_id, pushing) VALUES (7, 9, 1)",
            "Pushing kill SQL does not populate the mandatory column.");
        Assert(
            PlayerKillLog.CreateInsert(7, 9, false) ==
            "INSERT INTO log_player_kills (killer_id, target_id, pushing) VALUES (7, 9, 0)",
            "Normal kill SQL does not populate pushing=0.");

        var now = new DateTime(2026, 9, 9, 12, 0, 0, DateTimeKind.Utc);
        Assert(!RepairBotPolicy.CanRepair(false, 50, 100, now.AddMilliseconds(-9999), now), "Repair started before ten seconds elapsed.");
        Assert(RepairBotPolicy.CanRepair(false, 50, 100, now.AddSeconds(-10), now), "Repair did not start at ten seconds.");
        Assert(!RepairBotPolicy.CanRepair(false, 100, 100, now.AddSeconds(-20), now), "Repair ran at full HP.");
        Assert(!RepairBotPolicy.CanRepair(true, 50, 100, now.AddSeconds(-20), now), "Repair ran for a destroyed player.");

        foreach (var disabled in new[] { "drone_formation_f-3d-rg", "drone_formation_f-3d-dr", "drone_formation_f-3d-wl", null, "", "forged" })
        {
            Assert(!DroneFormationPolicy.IsAllowed(disabled), "Disabled or invalid formation was accepted: " + disabled);
            Assert(DroneFormationPolicy.Normalize(disabled) == "drone_formation_default", "Invalid formation was not normalized.");
        }
        foreach (var enabled in new[] { "drone_formation_default", "drone_formation_f-01-tu", "drone_formation_f-11-he" })
        {
            Assert(DroneFormationPolicy.IsAllowed(enabled), "Enabled formation was rejected: " + enabled);
            Assert(DroneFormationPolicy.Normalize(enabled) == enabled, "Enabled formation was changed.");
        }

        var deadline = now.AddSeconds(5);
        var match = new UbaMatchState(11, 22, deadline);
        Assert(match.Accept(11, now) == UbaTransition.Pending, "One acceptance started the match.");
        Assert(match.Accept(22, now) == UbaTransition.Start, "Two acceptances did not start the match.");
        Assert(match.Accept(22, now) == UbaTransition.Pending, "Duplicate acceptance restarted the match.");
        Assert(match.Accept(99, now) == UbaTransition.Pending, "Outsider changed the match.");
        Assert(match.TryFinish(), "First completion was rejected.");
        Assert(!match.TryFinish(), "Match completed twice.");

        var timeout = new UbaMatchState(11, 22, deadline);
        Assert(timeout.Accept(11, deadline.AddMilliseconds(1)) == UbaTransition.Cancel, "Late acceptance was allowed.");
        Assert(timeout.Timeout(deadline) == UbaTransition.Finished, "Cancelled match changed state twice.");

        var cancelled = new UbaMatchState(11, 22, deadline);
        Assert(cancelled.Cancel(22) == UbaTransition.Cancel, "Participant could not cancel.");
        Assert(cancelled.Cancel(99) == UbaTransition.Finished, "Outsider changed a cancelled match.");

        Console.WriteLine("PASS: gameplay reliability policies and UBA state transitions.");
    }
}
