using System.Collections.Generic;

namespace Ow.Game.Objects.Players.Managers
{
    public static class PermanentBoosterPolicy
    {
        public static Dictionary<BoosterType, BoostedAttributeType> All()
        {
            return new Dictionary<BoosterType, BoostedAttributeType>
            {
                { BoosterType.DMG_B01, BoostedAttributeType.DAMAGE },
                { BoosterType.DMG_B02, BoostedAttributeType.DAMAGE },
                { BoosterType.EP_B01, BoostedAttributeType.EP },
                { BoosterType.EP_B02, BoostedAttributeType.EP },
                { BoosterType.EP50, BoostedAttributeType.EP },
                { BoosterType.HON_B01, BoostedAttributeType.HONOUR },
                { BoosterType.HON_B02, BoostedAttributeType.HONOUR },
                { BoosterType.HON50, BoostedAttributeType.HONOUR },
                { BoosterType.HP_B01, BoostedAttributeType.MAXHP },
                { BoosterType.HP_B02, BoostedAttributeType.MAXHP },
                { BoosterType.REP_B01, BoostedAttributeType.REPAIR },
                { BoosterType.REP_B02, BoostedAttributeType.REPAIR },
                { BoosterType.REP_S01, BoostedAttributeType.REPAIR },
                { BoosterType.RES_B01, BoostedAttributeType.RESOURCE },
                { BoosterType.RES_B02, BoostedAttributeType.RESOURCE },
                { BoosterType.SHD_B01, BoostedAttributeType.SHIELD },
                { BoosterType.SHD_B02, BoostedAttributeType.SHIELD },
                { BoosterType.SREG_B01, BoostedAttributeType.SHIELDRECHARGE },
                { BoosterType.SREG_B02, BoostedAttributeType.SHIELDRECHARGE },
                { BoosterType.BB_01, BoostedAttributeType.BONUSBOXES },
                { BoosterType.QR_01, BoostedAttributeType.QUESTREWARD },
                { BoosterType.CD_B01, BoostedAttributeType.ABILITY_COOLDOWN },
                { BoosterType.CD_B02, BoostedAttributeType.ABILITY_COOLDOWN },
                { BoosterType.KAPPA_B01, BoostedAttributeType.DAMAGE },
                { BoosterType.HONM_1, BoostedAttributeType.HONOUR },
                { BoosterType.XPM_1, BoostedAttributeType.EP },
                { BoosterType.DMGM_1, BoostedAttributeType.DAMAGE }
            };
        }

        public static int Percentage(BoosterType booster)
        {
            switch (booster)
            {
                case BoosterType.EP50:
                case BoosterType.HON50:
                    return 50;
                case BoosterType.SHD_B01:
                case BoosterType.SHD_B02:
                case BoosterType.BB_01:
                case BoosterType.QR_01:
                    return 25;
                case BoosterType.KAPPA_B01:
                case BoosterType.HONM_1:
                case BoosterType.XPM_1:
                case BoosterType.DMGM_1:
                    return 5;
                default:
                    return 10;
            }
        }

        public static int MaximumPercentage(BoostedAttributeType attribute)
        {
            return attribute == BoostedAttributeType.DAMAGE ? 20 : int.MaxValue;
        }
    }
}
