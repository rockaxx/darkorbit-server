using Ow.Utils;

namespace Ow.Net.netty.commands
{
    class PetVisibilityCommand
    {
        public const short ID = 4390;

        public static byte[] write(int petId, bool isInvisible)
        {
            var packet = new ByteArray(ID);
            packet.writeShort(-30289);
            packet.writeShort(-5379);
            packet.writeInt(petId << 11 | petId >> 21);
            packet.writeBoolean(isInvisible);
            return packet.ToByteArray();
        }
    }
}
