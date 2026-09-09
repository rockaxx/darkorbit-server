using System;
using Ow.Utils;

internal static class EnvironmentConfigTest
{
    private static void Equal(int expected, int actual, string name)
    {
        if (expected != actual) throw new Exception(name + ": expected " + expected + ", got " + actual);
    }

    public static int Main()
    {
        Environment.SetEnvironmentVariable("DARKORBIT_TEST_PORT", null);
        Equal(8080, EnvironmentConfig.GetPort("DARKORBIT_TEST_PORT", 8080), "default port");

        Environment.SetEnvironmentVariable("DARKORBIT_TEST_PORT", "18080");
        Equal(18080, EnvironmentConfig.GetPort("DARKORBIT_TEST_PORT", 8080), "environment port");

        Environment.SetEnvironmentVariable("DARKORBIT_TEST_PORT", "70000");
        try
        {
            EnvironmentConfig.GetPort("DARKORBIT_TEST_PORT", 8080);
            throw new Exception("invalid port was accepted");
        }
        catch (InvalidOperationException error)
        {
            if (!error.Message.Contains("DARKORBIT_TEST_PORT")) throw;
        }

        Console.WriteLine("PASS: emulator environment port validation.");
        return 0;
    }
}
