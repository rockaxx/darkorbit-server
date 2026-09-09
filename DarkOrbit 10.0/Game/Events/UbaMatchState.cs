using System;
using System.Collections.Generic;

namespace Ow.Game.Events
{
    internal enum UbaTransition
    {
        Pending,
        Start,
        Cancel,
        Finished
    }

    internal sealed class UbaMatchState
    {
        private readonly object sync = new object();
        private readonly HashSet<int> accepted = new HashSet<int>();
        private bool started;
        private bool finished;

        public int FirstPlayerId { get; }
        public int SecondPlayerId { get; }
        public DateTime Deadline { get; }

        public UbaMatchState(int firstPlayerId, int secondPlayerId, DateTime deadline)
        {
            FirstPlayerId = firstPlayerId;
            SecondPlayerId = secondPlayerId;
            Deadline = deadline;
        }

        public UbaTransition Accept(int playerId, DateTime now)
        {
            lock (sync)
            {
                if (finished) return UbaTransition.Finished;
                if (!Contains(playerId) || started) return UbaTransition.Pending;
                if (now > Deadline)
                {
                    finished = true;
                    return UbaTransition.Cancel;
                }

                accepted.Add(playerId);
                if (accepted.Count != 2) return UbaTransition.Pending;
                started = true;
                return UbaTransition.Start;
            }
        }

        public UbaTransition Cancel(int playerId)
        {
            lock (sync)
            {
                if (finished || !Contains(playerId)) return UbaTransition.Finished;
                finished = true;
                return UbaTransition.Cancel;
            }
        }

        public UbaTransition Timeout(DateTime now)
        {
            lock (sync)
            {
                if (finished) return UbaTransition.Finished;
                if (started || now < Deadline) return UbaTransition.Pending;
                finished = true;
                return UbaTransition.Cancel;
            }
        }

        public bool TryFinish()
        {
            lock (sync)
            {
                if (finished) return false;
                finished = true;
                return true;
            }
        }

        private bool Contains(int playerId)
        {
            return playerId == FirstPlayerId || playerId == SecondPlayerId;
        }
    }
}
