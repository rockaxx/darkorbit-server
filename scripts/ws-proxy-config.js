function resolvePort(environment, name, fallback) {
  const raw = environment[name];
  if (raw === undefined || raw === '') return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

const resolveGamePort = environment => resolvePort(environment, 'DO_GAME_PORT', 8080);
const resolveWebSocketPort = environment => resolvePort(environment, 'DO_WS_PORT', 8081);

module.exports = { resolveGamePort, resolveWebSocketPort };
