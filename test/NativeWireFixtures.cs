using System;
using System.Collections.Generic;
using Ow.Net.netty.commands;
class NativeWireFixtures
{
    static void Emit(byte[] b) { Console.WriteLine(Convert.ToBase64String(b)); }
    static void Main()
    {
        var modifiers = new List<VisualModifierCommand> { new VisualModifierCommand(123, 8, 2, "test", 1, true) };
        Emit(ShipInitializationCommand.write(123,"Pilot","ship_goliath",420,200,300,400,500,6,7,8,9,12345,6789,13,1,0,3,true,1000,2000,18,3000,4000,0,1,"TAG",2,false,false,false,modifiers));
        Emit(ShipCreateCommand.write(456,"78",3,"NPC","Kristallin",15000,9000,0,0,0,false,new ClanRelationModule(0),0,false,true,false,0,0,modifiers,new class_11d(0)));
        Emit(PetHeroActivationCommand.write(123,456,22,3,"PET",1,0,15,"TAG",2345,6789,525,new class_11d(0)));
        Emit(CreatePortalCommand.write(789,1,2,18000,12000,true,true,new List<int>()));
        Emit(AttackHitCommand.write(new AttackTypeModule(1),123,456,200,100,0,1000,false));
        Emit(MoveCommand.write(456,1234,5678,900));
    }
}
