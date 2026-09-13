using Ow.Game.Movements;
using Ow.Game.Objects.Collectables;
using Ow.Game.Objects.Players;
using Ow.Game.Objects.Players.Managers;
using Ow.Managers;
using Ow.Net.netty.commands;
using Ow.Utils;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ow.Game.Objects
{
    class Pet : Character
    {
        public Player Owner { get; set; }

        public override int Speed
        {
            get
            {
                return (int)(Owner.Speed * 1.25);
            }
        }

        public bool Activated = false;
        public bool GuardModeActive = false;
        public bool KamikazeArmed = false;
        public DateTime KamikazeCooldownUntil = DateTime.MinValue;
        public short GearId = PetGearTypeModule.PASSIVE;
        private Character kamikazeTarget;
        private bool kamikazeRunning;

        public Pet(Player player) : base(Randoms.CreateRandomID(), "P.E.T 15", player.FactionId, GameManager.GetShip(22), player.Position, player.Spacemap, player.Clan)
        {
            Name = player.PetName;
            Owner = player;

            ShieldAbsorption = 0.8;
            Damage = 5000;
            MaxHitPoints = 50000;
            CurrentHitPoints = MaxHitPoints;
            MaxShieldPoints = 50000;
            CurrentShieldPoints = MaxShieldPoints;
        }

        public override void Tick()
        {
            if (Activated)
            {
                Movement.ActualPosition(this);
                CheckShieldPointsRepair();
                var kamikazeRunning = CheckKamikaze();
                if (!kamikazeRunning)
                {
                    CheckGuardMode();
                    CheckAutoLoot();
                    Follow(Owner);
                }
            }
        }

        private bool CheckKamikaze()
        {
            var now = DateTime.Now;
            var inCombat = Owner.AttackingOrUnderAttack(5) || LastCombatTime.AddSeconds(5) >= now;
            if (!KamikazeArmed)
            {
                kamikazeRunning = false;
                kamikazeTarget = null;
                return false;
            }
            if (!IsValidKamikazeTarget(kamikazeTarget))
            {
                kamikazeRunning = false;
                kamikazeTarget = FindKamikazeTarget();
            }
            if (!kamikazeRunning)
            {
                if (!PetKamikazePolicy.ShouldPursue(KamikazeArmed, Activated, inCombat,
                    Owner.CurrentHitPoints, Owner.MaxHitPoints, CurrentHitPoints, MaxHitPoints,
                    kamikazeTarget != null, now, KamikazeCooldownUntil)) return false;
                kamikazeRunning = true;
            }

            var targetPosition = Movement.ActualPosition(kamikazeTarget);
            var distance = Position.DistanceTo(targetPosition);
            if (!PetKamikazePolicy.ShouldDetonate(true, distance))
            {
                if (!Moving || Destination.DistanceTo(targetPosition) > 75)
                    Movement.Move(this, kamikazeTarget.Position);
                return true;
            }

            KamikazeArmed = false;
            kamikazeRunning = false;
            kamikazeTarget = null;
            KamikazeCooldownUntil = now.Add(PetKamikazePolicy.Cooldown);
            Owner.Settings.Cooldowns["pet_kamikaze"] = KamikazeCooldownUntil.ToString("yyyy-MM-dd HH:mm:ss");
            QueryManager.SavePlayer.Settings(Owner, "cooldowns", Owner.Settings.Cooldowns);
            Owner.SendPacket($"0|n|KAM|{Id}");
            SendPacketToInRangePlayers($"0|n|KAM|{Id}");

            foreach (var target in Spacemap.Characters.Values.ToList())
                ApplyKamikazeDamage(target);

            Owner.SendCommand(PetGearAddCommand.write(new PetGearTypeModule(PetGearTypeModule.KAMIKAZE), 1, 0, false));
            GearId = PetGearTypeModule.PASSIVE;
            Destroyed = true;
            Deactivate(true, true);
            return true;
        }

        private Character FindKamikazeTarget()
        {
            var selected = Owner.SelectedCharacter;
            if (IsValidKamikazeTarget(selected)) return selected;
            return Owner.InRangeCharacters.Values
                .Where(IsValidKamikazeTarget)
                .OrderBy(target => Position.DistanceTo(target.Position))
                .FirstOrDefault();
        }

        private bool IsValidKamikazeTarget(Character target)
        {
            return target != null && !target.Destroyed && !target.Invincible && target.Spacemap == Spacemap &&
                (target is Player || target is Npc) && Owner.TargetDefinition(target, false) &&
                (!(target is Player) || (target as Player).Attackable());
        }

        private void ApplyKamikazeDamage(Character target)
        {
            if (target == null || target.Destroyed || target.Invincible ||
                (!(target is Player) && !(target is Npc)) ||
                !PetKamikazePolicy.IsInBlastRadius(Position.DistanceTo(target.Position)) ||
                !Owner.TargetDefinition(target, false) ||
                (target is Player && !(target as Player).Attackable())) return;

            var damage = PetKamikazePolicy.Damage;
            var split = PetDamagePolicy.SplitDamage(damage, target.CurrentShieldPoints);
            var shieldDamage = split.Shield;
            var hitpointDamage = Math.Min(target.CurrentHitPoints, split.Hitpoints);
            var hitCommand = AttackHitCommand.write(new AttackTypeModule(AttackTypeModule.KAMIKAZE),
                Id, target.Id, target.CurrentHitPoints, target.CurrentShieldPoints,
                target.CurrentNanoHull, damage, false);
            Owner.SendCommand(hitCommand);
            foreach (var viewer in InRangeCharacters.Values.OfType<Player>().Where(player => player != Owner))
                viewer.SendCommand(hitCommand);

            target.CurrentShieldPoints -= shieldDamage;
            if (hitpointDamage >= target.CurrentHitPoints)
                target.Destroy(Owner, DestructionType.PET);
            else
            {
                target.CurrentHitPoints -= hitpointDamage;
                target.LastCombatTime = DateTime.Now;
                target.UpdateStatus();
            }
        }

        public void CheckAutoLoot()
        {
            //TODO
        }

        public DateTime lastShieldRepairTime = new DateTime();
        private void CheckShieldPointsRepair()
        {
            if (LastCombatTime.AddSeconds(10) >= DateTime.Now || lastShieldRepairTime.AddSeconds(1) >= DateTime.Now || CurrentShieldPoints == MaxShieldPoints) return;

            int repairShield = MaxShieldPoints / 25;
            CurrentShieldPoints += repairShield;
            UpdateStatus();

            lastShieldRepairTime = DateTime.Now;
        }

        public DateTime lastAttackTime = new DateTime();
        public DateTime lastRSBAttackTime = new DateTime();
        public void CheckGuardMode()
        {
            if (GuardModeActive)
            {
                foreach (var enemy in Owner.InRangeCharacters.Values)
                {
                    if (Owner.SelectedCharacter != null && Owner.SelectedCharacter != this)
                    {
                        if ((Owner.AttackingOrUnderAttack(5) || Owner.LastAttackTime(5)) || ((enemy is Player && (enemy as Player).LastAttackTime(5)) && enemy.SelectedCharacter == Owner))
                            Attack(Owner.SelectedCharacter);
                    }
                    else
                    {
                        if (((enemy is Player && (enemy as Player).LastAttackTime(5)) && enemy.SelectedCharacter == Owner))
                            Attack(enemy);
                    }
                }
            }
        }

        private void Attack(Character target)
        {
            if (!Owner.TargetDefinition(target, false)) return;
            if ((Owner.Settings.InGameSettings.selectedLaser == AmmunitionManager.RSB_75 ? lastRSBAttackTime : lastAttackTime).AddSeconds(Owner.Settings.InGameSettings.selectedLaser == AmmunitionManager.RSB_75 ? 3 : 1) < DateTime.Now)
            {
                int damageShd = 0, damageHp = 0;
                var ammunitionDamage = LaserAmmunitionPolicy.ApplyDamage(Damage,
                    Owner.Settings.InGameSettings.selectedLaser);

                if (target is Spaceball)
                {
                    var spaceball = target as Spaceball;
                    spaceball.AddDamage(this, ammunitionDamage);
                }

                var targetProtected = target is Player && !(target as Player).Attackable();
                var effectiveDamage = PetDamagePolicy.EffectiveDamage(ammunitionDamage, targetProtected);
                var split = PetDamagePolicy.SplitDamage(effectiveDamage, target.CurrentShieldPoints);
                damageShd = split.Shield;
                damageHp = Math.Min(target.CurrentHitPoints, split.Hitpoints);

                if (Invisible)
                {
                    Invisible = false;
                    string cloakPacket = "0|n|INV|" + Id + "|0";
                    SendPacketToInRangePlayers(cloakPacket);
                }

                if (target is Player && (target as Player).Storage.Sentinel)
                    damageShd -= Maths.GetPercentage(damageShd, 30);

                var laserRunCommand = AttackLaserRunCommand.write(Id, target.Id, Owner.AttackManager.GetSelectedLaser(), false, true);
                SendCommandToInRangePlayers(laserRunCommand);

                var attackHitCommand =
                        AttackHitCommand.write(new AttackTypeModule(AttackTypeModule.LASER), Id,
                                             target.Id, target.CurrentHitPoints,
                                             target.CurrentShieldPoints, target.CurrentNanoHull,
                                             effectiveDamage > damageShd ? effectiveDamage : damageShd, false);

                SendCommandToInRangePlayers(attackHitCommand);

                if (damageHp >= target.CurrentHitPoints || target.CurrentHitPoints == 0)
                    target.Destroy(this, DestructionType.PET);
                else
                    target.CurrentHitPoints -= damageHp;

                target.CurrentShieldPoints -= damageShd;
                target.LastCombatTime = DateTime.Now;

                if (Owner.Settings.InGameSettings.selectedLaser == AmmunitionManager.RSB_75)
                    lastRSBAttackTime = DateTime.Now;
                else
                    lastAttackTime = DateTime.Now;

                target.UpdateStatus();
            }
        }

        public void Activate()
        {
            if (!Activated && !Owner.Settings.InGameSettings.petDestroyed)
            {
                Activated = true;

                CurrentHitPoints = PetKamikazePolicy.ActivationHitpoints(CurrentHitPoints, MaxHitPoints);

                SetPosition(Owner.Position);
                Spacemap = Owner.Spacemap;
                Invisible = Owner.Invisible;

                Owner.SendPacket("0|A|STM|msg_pet_activated");

                Initialization(GearId);

                Spacemap.AddCharacter(this);
                SynchronizeVisibility();
                Program.TickManager.AddTick(this);
            }
            else
            {
                Deactivate();
            }
        }

        public void SynchronizeVisibility(Player viewer = null)
        {
            if (!Activated || Destroyed || Spacemap == null) return;
            Invisible = Owner.Invisible;
            var viewers = viewer != null ? new[] { viewer } : Spacemap.Characters.Values.OfType<Player>().ToArray();
            foreach (var nearbyPlayer in viewers)
            {
                var sameMap = nearbyPlayer.Spacemap == Spacemap;
                var distance = sameMap ? Position.DistanceTo(nearbyPlayer.Position) : double.MaxValue;
                var duelParticipant = Owner.Storage.Duel != null &&
                    Owner.Storage.Duel.Players.ContainsKey(nearbyPlayer.Id);
                if (!PetVisibilityPolicy.ShouldSynchronize(Activated, Destroyed, sameMap, distance, duelParticipant)) continue;
                var added = nearbyPlayer.AddInRangeCharacter(this);
                AddInRangeCharacter(nearbyPlayer);
                if (!added) SendActivationTo(nearbyPlayer);
            }
        }

        public void SendActivationTo(Player viewer)
        {
            var relationType = Owner.Clan.Id != 0 && viewer.Clan.Id != 0
                ? viewer.Clan.GetRelation(Owner.Clan)
                : (short)0;
            if (viewer == Owner)
                viewer.SendCommand(PetHeroActivationCommand.write(Owner.Id, Id, 22, 3, Name,
                    (short)Owner.FactionId, Owner.Clan.Id, 15, Owner.Clan.Tag, Position.X, Position.Y,
                    Speed, new class_11d(class_11d.DEFAULT)));
            else
                viewer.SendCommand(PetActivationCommand.write(Owner.Id, Id, 22, 3, Name,
                    (short)Owner.FactionId, Owner.Clan.Id, 15, Owner.Clan.Tag,
                    new ClanRelationModule(relationType), Position.X, Position.Y, Speed, false, !Invisible,
                    new class_11d(class_11d.DEFAULT)));
            viewer.SendCommand(PetVisibilityCommand.write(Id, Invisible));
            viewer.SendPacket(PetVisibilityPolicy.VisibilityPacket(Id, Invisible));
        }

        public void ForceSynchronizeVisibility(IEnumerable<Player> viewers)
        {
            if (!Activated || Destroyed || Spacemap == null) return;

            foreach (var viewer in viewers)
            {
                var sameMap = viewer != null && viewer.Spacemap == Spacemap;
                if (!PetVisibilityPolicy.ShouldForceRecreateAfterArenaLoad(Activated, Destroyed, sameMap)) continue;

                viewer.SendCommand(ShipRemoveCommand.write(Id));
                SendActivationTo(viewer);
                viewer.SendCommand(MoveCommand.write(Id, Position.X, Position.Y, 0));
            }
        }

        public void RepairDestroyed()
        {
            if (Owner.Settings.InGameSettings.petDestroyed)
            {
                var cost = Owner.Premium ? 0 : 250;

                if (Owner.Data.uridium >= cost)
                {
                    Destroyed = false;
                    CurrentHitPoints = MaxHitPoints;
                    CurrentShieldPoints = MaxShieldPoints;
                    Owner.ChangeData(DataType.URIDIUM, cost, ChangeType.DECREASE);
                    Owner.SendCommand(PetRepairCompleteCommand.write());
                    Owner.Settings.InGameSettings.petDestroyed = false;
                    QueryManager.SavePlayer.Settings(Owner, "inGameSettings", Owner.Settings.InGameSettings);
                } else Owner.SendPacket("0|A|STM|ttip_pet_repair_disabled_through_money");
            }
        }

        public void Deactivate(bool direct = false, bool destroyed = false)
        {
            if (Activated)
            {
                if (LastCombatTime.AddSeconds(10) < DateTime.Now || direct)
                {
                    Owner.SendPacket("0|PET|D");

                    if (destroyed)
                    {
                        Owner.Settings.InGameSettings.petDestroyed = true;
                        QueryManager.SavePlayer.Settings(Owner, "inGameSettings", Owner.Settings.InGameSettings);

                        Owner.SendPacket("0|PET|Z");
                        CurrentShieldPoints = 0;
                        UpdateStatus();

                        Owner.SendCommand(PetInitializationCommand.write(true, true, false));
                        Owner.SendCommand(PetUIRepairButtonCommand.write(true, 250));
                    }
                    else Owner.SendPacket("0|A|STM|msg_pet_deactivated");

                    Activated = false;
                    kamikazeTarget = null;
                    kamikazeRunning = false;

                    Deselection();
                    Spacemap.RemoveCharacter(this);
                    InRangeCharacters.Clear();
                    Program.TickManager.RemoveTick(this);
                }
                else
                {
                    Owner.SendPacket("0|A|STM|msg_pet_in_combat");
                }
            }
        }

        private void Initialization(short gearId = PetGearTypeModule.PASSIVE)
        {
            LoadKamikazeCooldown();
            Owner.SendCommand(PetStatusCommand.write(Id, 15, 27000000, 27000000, CurrentHitPoints, MaxHitPoints, CurrentShieldPoints, MaxShieldPoints, 50000, 50000, Speed, Name));
            Owner.SendCommand(PetGearAddCommand.write(new PetGearTypeModule(PetGearTypeModule.PASSIVE), 0, 0, true));
            Owner.SendCommand(PetGearAddCommand.write(new PetGearTypeModule(PetGearTypeModule.GUARD), 0, 0, true));
            Owner.SendCommand(PetGearAddCommand.write(new PetGearTypeModule(PetGearTypeModule.KAMIKAZE), 1, 0, DateTime.Now >= KamikazeCooldownUntil));
            SwitchGear(gearId);
        }

        private void Follow(Character character)
        {
            var distance = Position.DistanceTo(character.Position);
            if (distance < 450 && character.Moving) return;

            if (character.Moving)
            {
                Movement.Move(this, character.Position);
            }
            else if (Math.Abs(distance - 300) > 250 && !Moving)
                Movement.Move(this, Position.GetPosOnCircle(character.Position, 250));
        }

        public void SwitchGear(short gearId)
        {
            if (!Activated)
                Activate();

            LoadKamikazeCooldown();

            switch (gearId)
            {
                case PetGearTypeModule.PASSIVE:
                    GuardModeActive = false;
                    KamikazeArmed = false;
                    kamikazeTarget = null;
                    kamikazeRunning = false;
                    break;
                case PetGearTypeModule.GUARD:
                    GuardModeActive = true;
                    KamikazeArmed = false;
                    kamikazeTarget = null;
                    kamikazeRunning = false;
                    break;
                case PetGearTypeModule.KAMIKAZE:
                    if (DateTime.Now < KamikazeCooldownUntil)
                    {
                        Owner.SendPacket("0|A|STM|ttip_pet_kamikaze-gear_cooldown");
                        return;
                    }
                    GuardModeActive = false;
                    KamikazeArmed = true;
                    break;
            }
            GearId = gearId;

            Owner.SendCommand(PetGearSelectCommand.write(new PetGearTypeModule(gearId), new List<int>()));
        }

        private void LoadKamikazeCooldown()
        {
            string value;
            DateTime stored;
            if (Owner.Settings.Cooldowns.TryGetValue("pet_kamikaze", out value) &&
                DateTime.TryParse(value, out stored) && stored > KamikazeCooldownUntil)
                KamikazeCooldownUntil = stored;
        }

        public override byte[] GetShipCreateCommand() { return null; }
    }
}
