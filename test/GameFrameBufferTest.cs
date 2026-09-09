using System;
using System.Collections.Generic;
using Ow.Utils;
class GameFrameBufferTest
{
    static void Main()
    {
        var f = new GameFrameBuffer(); var received = new List<byte[]>();
        f.Push(new byte[] {0}, received.Add);
        f.Push(new byte[] {3,0,7}, received.Add);
        if (received.Count != 0) throw new Exception("Fragment dispatched early");
        f.Push(new byte[] {9,0,2,0,8,0}, received.Add);
        if (received.Count != 2 || received[0][4] != 9 || received[1][3] != 8) throw new Exception("Frames lost");
        f.Push(new byte[] {2,0,10}, received.Add);
        if (received.Count != 3 || received[2][3] != 10) throw new Exception("Trailing fragment lost");
        try { new GameFrameBuffer().Push(new byte[] {0,1}, received.Add); throw new Exception("Invalid accepted"); }
        catch (InvalidOperationException) { }
        Console.WriteLine("PASS: C# game stream fragmentation, coalescing, invalid length.");
    }
}
