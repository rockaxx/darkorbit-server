using System.Collections.Generic;

namespace Ow.Game.Objects.Players.Managers
{
    internal static class DroneFormationPolicy
    {
        private const string DefaultFormation = "drone_formation_default";

        private static readonly HashSet<string> Allowed = new HashSet<string>
        {
            DefaultFormation,
            "drone_formation_f-01-tu",
            "drone_formation_f-02-ar",
            "drone_formation_f-03-la",
            "drone_formation_f-04-st",
            "drone_formation_f-05-pi",
            "drone_formation_f-06-da",
            "drone_formation_f-07-di",
            "drone_formation_f-08-ch",
            "drone_formation_f-09-mo",
            "drone_formation_f-10-cr",
            "drone_formation_f-11-he",
            "drone_formation_f-12-ba",
            "drone_formation_f-13-bt",
            "drone_formation_f-3d-dm",
            "drone_formation_f-3d-vt",
            "drone_formation_f-3d-wv",
            "drone_formation_f-3d-x"
        };

        public static bool IsAllowed(string formation)
        {
            return formation != null && Allowed.Contains(formation);
        }

        public static string Normalize(string formation)
        {
            return IsAllowed(formation) ? formation : DefaultFormation;
        }
    }
}
