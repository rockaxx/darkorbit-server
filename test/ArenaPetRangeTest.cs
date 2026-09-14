using System;
using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.Serialization;
using Ow.Game;
using Ow.Game.Events;
using Ow.Game.Objects;
using Ow.Game.Movements;
using Ow.Game.Objects.Players.Managers;

internal static class ArenaPetRangeTest
{
    // Avoid database/login side effects; exercise the real range filter used by every map tick.
    private static T Empty<T>() { return (T)FormatterServices.GetUninitializedObject(typeof(T)); }
    private static void Field(object value, Type type, string name, object data)
    {
        type.GetField("<" + name + ">k__BackingField", BindingFlags.Instance | BindingFlags.NonPublic).SetValue(value, data);
    }
    private static T Entity<T>(int id, Spacemap map) where T : Character
    {
        var entity = Empty<T>();
        Field(entity, typeof(Attackable), "Id", id);
        entity.Spacemap = map;
        entity.Position = new Position(100, 100);
        entity.Storage = Empty<Storage>();
        entity.InRangeCharacters = new ConcurrentDictionary<int, Character>();
        entity.Storage.InRangeAssets = new ConcurrentDictionary<int, Activatable>();
        map.Characters.TryAdd(id, entity);
        return entity;
    }
    private static void Check(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }
    public static void Main()
    {
        var map = Empty<Spacemap>();
        map.Id = 121;
        map.Options = new OptionsBase();
        map.Characters = new ConcurrentDictionary<int, Character>();
        var first = Entity<Player>(1, map);
        var second = Entity<Player>(2, map);
        var outsider = Entity<Player>(3, map);
        var duel = Empty<Duel>();
        Field(duel, typeof(Duel), "ArenaMap", map);
        Field(duel, typeof(Duel), "Players", new ConcurrentDictionary<int, Player>());
        duel.Players.TryAdd(1, first);
        duel.Players.TryAdd(2, second);
        first.Storage.Duel = second.Storage.Duel = duel;
        var pet = Entity<Pet>(4, map);
        pet.Owner = second;
        pet.Activated = true;
        Check(first.InRange(second), "opponent must remain visible");
        Check(first.InRange(pet), "map tick must retain opponent PET for rendering and selection");
        Check(second.InRange(pet), "map tick must retain own PET");
        pet.Activated = false;
        Check(!first.InRange(pet), "deactivated PET must not be re-added by a map tick");
        pet.Activated = true;
        Check(first.InRange(pet), "reactivated PET must remain visible on subsequent ticks");
        first.AttackManager = Empty<AttackManager>();
        pet.Ship = Empty<Ship>();
        if (first.InRange(pet)) first.InRangeCharacters.TryAdd(pet.Id, pet);
        first.SelectEntity(pet.Id);
        Check(first.Selected == pet, "opponent PET must be selectable after reactivation");
        pet.Destroyed = true;
        Check(!first.InRange(pet), "destroyed PET must stay hidden");
        pet.Destroyed = false;
        pet.Owner = outsider;
        Check(!first.InRange(pet) && !first.InRange(outsider), "unrelated entities must stay excluded");
        pet.Owner = second;
        pet.Position = new Position(5000, 5000);
        Check(!first.InRange(pet), "normal render distance must still apply");
        pet.Position = first.Position;
        pet.Spacemap = Empty<Spacemap>();
        pet.Spacemap.Id = 1;
        Check(!first.InRange(pet), "PET on another map must stay hidden");
        Console.WriteLine("PASS: arena PET range lifecycle.");
    }
}
