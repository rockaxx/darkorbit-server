using Newtonsoft.Json;
using Ow.Game.Objects;
using Ow.Managers;
using Ow.Net.netty.commands;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ow.Game.Objects.Players.Managers
{
    public class BoosterBase
    {
        public short Type { get; set; }
        public int Seconds { get; set; }

        public BoosterBase(short type, int seconds)
        {
            Type = type;
            Seconds = seconds;
        }
    }

    class BoosterManager : AbstractManager
    {
        public Dictionary<short, List<BoosterBase>> Boosters = new Dictionary<short, List<BoosterBase>>();

        public BoosterManager(Player player) : base(player) { }

        private DateTime boosterTime = new DateTime();
        public void Tick()
        {
            if (boosterTime.AddSeconds(5) < DateTime.Now)
            {
                for (short i = 0; i < Boosters.ToList().Count; i++)
                {
                    var boosters = Boosters.ToList()[i].Value;

                    for (short k = 0; k < boosters.Count; k++)
                    {
                        if (boosters[k].Seconds < 0)
                            continue;

                        boosters[k].Seconds -= 5;

                        if (boosters[k].Seconds <= 0)
                            Remove((BoosterType)boosters[k].Type);
                    }
                }
                boosterTime = DateTime.Now;
            }
        }

        public void EnsureEliteBoosters()
        {
            EnsureAllPermanentBoosters();
        }

        public void EnsureAllPermanentBoosters()
        {
            foreach (var booster in PermanentBoosterPolicy.All())
                EnsurePermanentBooster(booster.Value, booster.Key);
        }

        private void EnsurePermanentBooster(BoostedAttributeType attribute, BoosterType boosterType)
        {
            var attributeId = (short)attribute;
            var typeId = (short)boosterType;
            if (!Boosters.ContainsKey(attributeId))
                Boosters[attributeId] = new List<BoosterBase>();

            var existing = Boosters[attributeId].FirstOrDefault(booster => booster.Type == typeId);
            if (existing == null)
                Boosters[attributeId].Add(new BoosterBase(typeId, -1));
            else
                existing.Seconds = -1;
        }

        public void Add(BoosterType boosterType, int hours)
        {
            Player.SendPacket($"0|A|STM|booster_found|%BOOSTERNAME%|{boosterType.ToString()}|%HOURS%|{hours}");

            var seconds = (int)TimeSpan.FromHours(hours).TotalSeconds;
            var boostedAttributeType = GetBoosterType((short)boosterType);

            if (boostedAttributeType.HasValue)
            {
                var attributeId = boostedAttributeType.Value;
                if (!Boosters.ContainsKey(attributeId))
                    Boosters[attributeId] = new List<BoosterBase>();

                if (Boosters[attributeId].Where(x => x.Type == (short)boosterType).Count() <= 0)
                    Boosters[attributeId].Add(new BoosterBase((short)boosterType, seconds));
                else
                    Boosters[attributeId].Where(x => x.Type == (short)boosterType).FirstOrDefault().Seconds += seconds;

                Update();
                QueryManager.SavePlayer.Boosters(Player);
            }
        }

        public void Remove(BoosterType boosterType)
        {
            var boostedAttributeType = GetBoosterType((short)boosterType);

            if (boostedAttributeType.HasValue)
            {
                var attributeId = boostedAttributeType.Value;
                if (Boosters.ContainsKey(attributeId))
                    Boosters[attributeId].Remove(Boosters[attributeId].Where(x => x.Type == (short)boosterType).FirstOrDefault());

                if (Boosters.ContainsKey(attributeId) && Boosters[attributeId].Count == 0)
                    Boosters.Remove(attributeId);

                Update();
                QueryManager.SavePlayer.Boosters(Player);
            }
        }

        public void Update()
        {
            var boostedAttributes = new List<BoosterUpdateModule>();

            foreach (var attribute in Boosters.OrderBy(entry => entry.Key))
                if (attribute.Value.Count >= 1)
                    boostedAttributes.Add(new BoosterUpdateModule(new BoostedAttributeTypeModule(attribute.Key),
                        GetPercentage((BoostedAttributeType)attribute.Key),
                        attribute.Value.Select(x => new BoosterTypeModule(x.Type)).ToList()));

            Player.SendCommand(AttributeBoosterUpdateCommand.write(boostedAttributes));
            Player.SendCommand(AttributeHitpointUpdateCommand.write(Player.CurrentHitPoints, Player.MaxHitPoints, Player.CurrentNanoHull, Player.MaxNanoHull));
            Player.SendCommand(AttributeShieldUpdateCommand.write(Player.CurrentShieldPoints, Player.MaxShieldPoints));

            //TODO dont need every time
            Player.SettingsManager.SendMenuBarsCommand();
        }

        public int GetPercentage(BoostedAttributeType boostedAttributeType)
        {
            var percentage = 0;

            if (Boosters.ContainsKey((short)boostedAttributeType))
                foreach (var booster in Boosters[(short)boostedAttributeType])
                    percentage += GetBoosterPercentage(booster.Type);

            return Math.Min(percentage, PermanentBoosterPolicy.MaximumPercentage(boostedAttributeType));
        }

        private short? GetBoosterType(short boosterType)
        {
            var type = (BoosterType)boosterType;
            var all = PermanentBoosterPolicy.All();
            return all.ContainsKey(type) ? (short?)all[type] : null;
        }

        private int GetBoosterPercentage(short boosterTypeModule)
        {
            return PermanentBoosterPolicy.Percentage((BoosterType)boosterTypeModule);
        }
    }
}
