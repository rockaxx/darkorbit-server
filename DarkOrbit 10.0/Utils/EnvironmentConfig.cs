using System;

namespace Ow.Utils
{
    public static class EnvironmentConfig
    {
        public static int GetPort(string variableName, int fallback)
        {
            string raw = Environment.GetEnvironmentVariable(variableName);
            if (String.IsNullOrWhiteSpace(raw)) return fallback;

            int port;
            if (!Int32.TryParse(raw, out port) || port < 1 || port > 65535)
            {
                throw new InvalidOperationException(variableName + " must be an integer between 1 and 65535.");
            }
            return port;
        }
    }
}
