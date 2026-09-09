using System;
using System.Collections.Generic;

namespace Ow.Utils
{
    // TCP reads are arbitrary chunks, not complete game commands.
    class GameFrameBuffer
    {
        private readonly List<byte> pending = new List<byte>();
        public void Push(byte[] bytes, Action<byte[]> receive)
        {
            pending.AddRange(bytes);
            int offset = 0;
            while (pending.Count - offset >= 2)
            {
                int length = (pending[offset] << 8) | pending[offset + 1];
                if (length < 2) throw new InvalidOperationException("Invalid game frame length");
                if (pending.Count - offset < length + 2) break;
                receive(pending.GetRange(offset, length + 2).ToArray());
                offset += length + 2;
            }
            if (offset > 0) pending.RemoveRange(0, offset);
        }
    }
}
