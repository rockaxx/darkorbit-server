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

        public Pet(Player player) : base(Randoms.CreateRandomID(), "P.E.T 15", player.FactionId, GameManager.GetShip(22), player.Position, player.Spacemap, player.Clan)
        {
            Name = player.PetName;
            Owner = player;

            ShieldAbsorption = 0.8;
            Damage = 5000;
            CurrentHitPoints = 2500;
            MaxHitPoints = 50000;
            MaxShieldPoints = 50000;
            CurrentShieldPoints = MaxShieldPoints;
        }

        public override void Tick()
        {
            if (Activated)
            {
                CheckShieldPointsRepair();
                CheckGuardMode();
                CheckKamikaze();
                CheckAutoLoot();
                Follow(Owner);
                Movement.ActualPosition(this);
            }
        }

        private void CheckKamikaze()
        {
            var now = DateTime.Now;
            var inCombat = Owner.AttackingOrUnderAttack(5) || LastCombatTime.AddSeconds(5) >= now;
            if (!PetKamikazePolicy.ShouldTrigger(KamikazeArmed, Activated, inCombat,
                Owner.CurrentHitPoints, Owner.MaxHitPoints, CurrentHitPoints, MaxHitPoints,
                now, KamikazeCooldownUntil)) return;

            KamikazeArmed = false;
            KamikazeCooldownUntil = now.Add(PetKamikazePolicy.Cooldown);
            Owner.Settings.Cooldowns["pet_kamikaze"] = KamikazeCooldownUntil.ToString("yyyy-MM-dd HH:mm:ss");
            QueryManager.SavePlayer.Settings(Owner, "cooldowns", Owner.Settings.Cooldowns);
            Owner.SendPacket($"0|n|KAM|{Id}");
            SendPacketToInRangePlayers($"0|n|KAM|{Id}");

            foreach (var target in InRangeCharacters.Values.ToList())
                ApplyKamikazeDamage(target);

            Owner.SendCommand(PetGearAddCommand.write(new PetGearTypeModule(PetGearTypeModule.KAMIKAZE), 1, 0, false));
            GearId = PetGearTypeModule.PASSIVE;
            Destroyed = true;
            Deactivate(true, true);
        }

        private void ApplyKamikazeDamage(Character target)
        {
            if (target == null || target.Destroyed || target.Invincible ||
                (!(target is Player) && !(target is Npc)) ||
                !PetKamikazePolicy.IsInBlastRadius(Position.DistanceTo(target.Position)) ||
                !Owner.TargetDefinition(target, false) ||
                (target is Player && !(target as Player).Attackable())) return;

            var damage = PetKamikazePolicy.Damage;
            var shieldDamage = Math.Min(target.CurrentShieldPoints, (int)(damage * target.ShieldAbsorption));
            var hitpointDamage = Math.Min(target.CurrentHitPoints, damage - shieldDamage);
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

                if (target is Spaceball)
                {
                    var spaceball = target as Spaceball;
                    spaceball.AddDamage(this, Damage);
                }

                double shieldAbsorb = System.Math.Abs(target.ShieldAbsorption - 1);

                if (shieldAbsorb > 1)
                    shieldAbsorb = 1;

                if ((target.CurrentShieldPoints - Damage) >= 0)
                {
                    damageShd = (int)(Damage * shieldAbsorb);
                    damageHp = Damage - damageShd;
                }
                else
                {
                    int newDamage = Damage - target.CurrentShieldPoints;
                    damageShd = target.CurrentShieldPoints;
                    damageHp = (int)(newDamage + (damageShd * shieldAbsorb));
                }

                if ((target.CurrentHitPoints - damageHp) < 0)
                {
                    damageHp = target.CurrentHitPoints;
                }

                if (target is Player && !(target as Player).Attackable())
                {
                    Damage = 0;
                    damageShd = 0;
                    damageHp = 0;
                }

                if (Invisible)
                {
                    Invisible = false;
                    string cloakPacket = "0|n|INV|" + Id + "|0";
                    SendPacketToInRangePlayers(cloakPacket);
                }

                if (target is Player && (target as Player).Storage.Sentinel)
                    damageShd -= Maths.GetPercentage(damageShd, 30);

                var laserRunCommand = AttackLaserRunCommand.write(Id, target.Id, Owner.AttackManager.GetSelectedLaser(), false, false);
                SendCommandToInRangePlayers(laserRunCommand);

                var attackHitCommand =
                        AttackHitCommand.write(new AttackTypeModule(AttackTypeModule.LASER), Id,
                                             target.Id, target.CurrentHitPoints,
                                             target.CurrentShieldPoints, target.CurrentNanoHull,
                                             Damage > damageShd ? Damage : damageShd, false);

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

                CurrentHitPoints = 2500;

                SetPosition(Owner.Position);
                Spacemap = Owner.Spacemap;
                Invisible = Owner.Invisible;

                Owner.SendPacket("0|A|STM|msg_pet_activated");

                Initialization(GearId);

                Spacemap.AddCharacter(this);
                Program.TickManager.AddTick(this);
            }
            else
            {
                Deactivate();
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
                    break;
                case PetGearTypeModule.GUARD:
                    GuardModeActive = true;
                    KamikazeArmed = false;
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
