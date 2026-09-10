using System;
using System.Net.Sockets;
using Ow.Net;

namespace Ow.Utils
{
    static class Logger
    {
        public static void Log(string fileName, string message) { }
    }
}

namespace Ow.Net
{
    class GameClient
    {
        public GameClient(Socket socket) { }
    }
}

static class GameServerPortTest
{
    static int Main()
    {
        if (GameServer.Port != 18080)
            throw new Exception("GameServer ignored DO_GAME_PORT; got " + GameServer.Port);

        Console.WriteLine("PASS: game server honors configured port.");
        return 0;
    }
}
