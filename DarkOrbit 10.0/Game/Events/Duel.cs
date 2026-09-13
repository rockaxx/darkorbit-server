using Ow.Game.Movements;
using Ow.Game.Objects;
using Ow.Game.Objects.Mines;
using Ow.Game.Objects.Players.Managers;
using Ow.Game.Ticks;
using Ow.Managers;
using Ow.Net.netty.commands;
using Ow.Utils;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Ow.Game.Events
{
    class Duel : Tick
    {
        private sealed class ReturnLocation
        {
            public int MapId { get; }
            public Position Position { get; }

            public ReturnLocation(Player player)
            {
                MapId = player.Spacemap.Id;
                Position = new Position(player.Position.X, player.Position.Y);
            }
        }

        public static readonly int[] AvailableArenaMaps = Enumerable
            .Range(DuelPolicy.FirstArenaMapId, DuelPolicy.LastArenaMapId - DuelPolicy.FirstArenaMapId + 1)
            .ToArray();
        private static readonly ConcurrentDictionary<int, Duel> ActiveArenas = new ConcurrentDictionary<int, Duel>();
        private static readonly object ArenaAllocationLock = new object();

        public bool PeaceArea = true;
        public ConcurrentDictionary<int, Player> Players { get; }
        public Spacemap ArenaMap { get; }
        public Position Position1 = new Position(DuelPolicy.FirstSpawnX, DuelPolicy.FirstSpawnY);
        public Position Position2 = new Position(DuelPolicy.SecondSpawnX, DuelPolicy.SecondSpawnY);

        private readonly Dictionary<int, Player> participants;
        private readonly Dictionary<int, ReturnLocation> ReturnLocations;
        private readonly bool competitive;
        private readonly int competitiveMatchId;
        private int finished;

        private Duel(Player first, Player second, int arenaMapId, bool competitive, int competitiveMatchId)
        {
            this.competitive = competitive;
            this.competitiveMatchId = competitiveMatchId;
            ArenaMap = GameManager.GetSpacemap(arenaMapId);
            Players = new ConcurrentDictionary<int, Player>();
            Players.TryAdd(first.Id, first);
            Players.TryAdd(second.Id, second);
            participants = Players.ToDictionary(entry => entry.Key, entry => entry.Value);
            ReturnLocations = participants.ToDictionary(entry => entry.Key, entry => new ReturnLocation(entry.Value));
            var ordered = participants.Values.OrderBy(player => player.Id).ToArray();
            foreach (var player in ordered)
            {
                player.Storage.Duel = this;
                player.CpuManager.DisableCloak();
                player.SkillManager.DisableAllSkills();
                player.AddVisualModifier(VisualModifierCommand.CAMERA, 0, "", 0, true);
            }
            ordered[0].Jump(ArenaMap.Id, Position1);
            ordered[1].Jump(ArenaMap.Id, Position2);

            Program.TickManager.AddTick(this);
            StartCountdown();
        }

        public static bool CanCreate(Player first, Player second)
        {
            var firstOnline = first?.GameSession != null;
            var secondOnline = second?.GameSession != null;
            var firstBusy = first != null && (first.Storage.Duel != null || first.Storage.Uba != null || EventManager.JackpotBattle.InEvent(first));
            var secondBusy = second != null && (second.Storage.Duel != null || second.Storage.Uba != null || EventManager.JackpotBattle.InEvent(second));
            return DuelPolicy.CanInvite(first?.Id ?? 0, second?.Id ?? 0, firstOnline, secondOnline, firstBusy, secondBusy) &&
                !first.Destroyed && !second.Destroyed;
        }

        public static bool CanQueue(Player player)
        {
            return player != null && player.GameSession != null && !player.Destroyed &&
                player.Storage.Duel == null && player.Storage.Uba == null && !EventManager.JackpotBattle.InEvent(player);
        }

        public static bool TryCreate(Player first, Player second)
        {
            return TryCreate(first, second, false, 0);
        }

        public static bool TryCreateCompetitive(Player first, Player second, int matchId)
        {
            return matchId > 0 && TryCreate(first, second, true, matchId);
        }

        private static bool TryCreate(Player first, Player second, bool competitive, int matchId)
        {
            lock (ArenaAllocationLock)
            {
                if (!CanCreate(first, second)) return false;
                var mapId = AvailableArenaMaps.FirstOrDefault(id => !ActiveArenas.ContainsKey(id) && GameManager.GetSpacemap(id) != null);
                if (mapId == 0) return false;
                var duel = new Duel(first, second, mapId, competitive, matchId);
                return ActiveArenas.TryAdd(mapId, duel);
            }
        }

        private async void StartCountdown()
        {
            await Task.Delay(Portal.JUMP_DELAY + 250);
            foreach (var player in Players.Values)
            {
                var pet = player.Pet;
                if (PetVisibilityPolicy.ShouldActivateForDuel(pet != null, pet?.Activated ?? false,
                    player.Settings.InGameSettings.petDestroyed))
                {
                    pet.Invisible = false;
                    pet.Activate();
                }
                else if (pet != null && pet.Activated && !pet.Destroyed)
                {
                    pet.Invisible = false;
                    pet.SynchronizeVisibility();
                }
                player.SendPacket(competitive
                    ? "0|A|STM|Competitive 1v1: Elo zapas. PET je povoleny, schopnosti lode su vypnute."
                    : "0|A|STM|1v1: PET je povoleny, schopnosti lode su vypnute.");
            }
            for (var seconds = DuelPolicy.CountdownSeconds; seconds > 0 && Volatile.Read(ref finished) == 0; seconds--)
            {
                foreach (var player in Players.Values)
                    player.SendPacket($"0|A|STM|jp_no_attack_n_seconds|%!|{seconds}");
                await Task.Delay(1000);
            }
            if (Volatile.Read(ref finished) == 0)
            {
                PeaceArea = false;
                foreach (var player in Players.Values)
                {
                    foreach (var poiId in DuelPolicy.SpawnBarrierPoiIds)
                        player.SendCommand(MapRemovePOICommand.write(poiId));
                    player.SendPacket("0|A|STM|label_traininggrounds_battle_has_begun");
                }

                foreach (var pet in Players.Values.Select(player => player.Pet).Where(pet => pet != null))
                {
                    pet.Invisible = false;
                    pet.ForceSynchronizeVisibility(Players.Values);
                }
            }
        }

        public void Tick()
        {
            if (Players.Count <= 1) Finish();
        }

        private async void Finish()
        {
            if (Interlocked.Exchange(ref finished, 1) != 0) return;
            Program.TickManager.RemoveTick(this);
            PeaceArea = true;

            var winner = Players.Values.FirstOrDefault(player => player.GameSession != null);
            var loser = participants.Values.FirstOrDefault(player => winner == null || player.Id != winner.Id);
            if (winner != null && loser != null)
            {
                try
                {
                    if (competitive)
                        QueryManager.RecordCompetitiveResult(competitiveMatchId, winner.Id, loser.Id);
                    else
                        QueryManager.RecordDuelResult(winner.Id, loser.Id);
                }
                catch (Exception error)
                {
                    Logger.Log("error_log", $"- [Duel.cs] Record duel result failed: {error}");
                }
            }
            if (winner != null)
                winner.SendPacket("0|n|KSMSG|label_traininggrounds_results_victory");
            foreach (var participant in participants.Values.Where(player => winner == null || player.Id != winner.Id))
                if (participant.GameSession != null)
                    participant.SendPacket("0|n|KSMSG|label_traininggrounds_results_defeat");

            await Task.Delay(2500);
            foreach (var participant in participants.Values)
            {
                foreach (var mine in ArenaMap.Objects.Values.OfType<Mine>().Where(mine => mine.Player == participant).ToList())
                    mine.Remove(true);
                participant.RemoveVisualModifier(VisualModifierCommand.CAMERA);
                participant.DisableAttack(participant.Settings.InGameSettings.selectedLaser);
                if (participant.Storage.Duel == this) participant.Storage.Duel = null;

                if (GameManager.GetGameSession(participant.Id) == null) continue;
                var location = ReturnLocations[participant.Id];
                participant.Destroyed = false;
                participant.CurrentHitPoints = participant.MaxHitPoints;
                participant.CurrentShieldConfig1 = participant.MaxShieldPoints;
                participant.CurrentShieldConfig2 = participant.MaxShieldPoints;
                participant.Jump(location.MapId, new Position(location.Position.X, location.Position.Y));
            }

            await Task.Delay(Portal.JUMP_DELAY + 500);
            ActiveArenas.TryRemove(ArenaMap.Id, out var ignored);
            Players.Clear();
        }

        public static void RemovePlayer(Player player)
        {
            var duel = player?.Storage.Duel;
            if (duel == null) return;
            duel.Players.TryRemove(player.Id, out var ignored);
            if (player.Storage.Duel == duel) player.Storage.Duel = null;
            if (duel.Players.Count <= 1) duel.Finish();
        }

        public static bool InDuel(Player player)
        {
            var duel = player?.Storage.Duel;
            return duel != null && player.Spacemap != null && player.Spacemap.Id == duel.ArenaMap.Id &&
                duel.ArenaMap.Characters.ContainsKey(player.Id);
        }

        public Player GetOpponent(Player player)
        {
            return Players.Values.FirstOrDefault(candidate => candidate.Id != player.Id);
        }
    }
}
