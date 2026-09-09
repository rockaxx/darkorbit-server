namespace Ow.Game.Objects.Players
{
    internal static class PlayerKillLog
    {
        public static string CreateInsert(int killerId, int targetId, bool pushing)
        {
            return $"INSERT INTO log_player_kills (killer_id, target_id, pushing) VALUES ({killerId}, {targetId}, {(pushing ? 1 : 0)})";
        }
    }
}
