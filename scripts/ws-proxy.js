// Public gateway: serves the local CMS and bridges browser WebSockets to the
// emulator's native TCP ports. Cloudflare Tunnel points at this one port.
const http = require('node:http');
const net = require('node:net');
const { WebSocket, WebSocketServer } = require('ws');

const listenPort = Number(process.env.DO_GATEWAY_PORT || 8081);
const webPort = Number(process.env.DO_WEB_PORT || 80);
const routes = { '/socket/game': 8080, '/socket/chat': 9338, '/game': 8080, '/chat': 9338 };
const server = http.createServer((req, res) => {
  // The response body may be rewritten for public URLs. Ask PHP for plain text
  // so a gzip payload cannot be accidentally relayed with stale encoding data.
  const headers = { ...req.headers, host: `127.0.0.1:${webPort}`, 'accept-encoding': 'identity' };
  const upstream = http.request({ hostname: '127.0.0.1', port: webPort, path: req.url, method: req.method, headers }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      const body = Buffer.concat(chunks);
      const contentType = String(response.headers['content-type'] || '');
      const publicHost = req.headers.host || '';
      const publicOrigin = `https://${publicHost}`;
      const isText = /text|javascript|json|xml|css/i.test(contentType);
      let text = isText ? body.toString('utf8').replace(/https?:\/\/127\.0\.0\.1(?::80)?/gi, publicOrigin) : null;
      // The legacy preloader uses the `host` Flash variable for HTTP assets.
      // Keep map/chat socket addresses local for the desktop TCP bridge, but
      // send asset requests through the public tunnel.
      if (text !== null && /^\/map-revolution(?:\/|\?|$)/.test(req.url || '')) {
        text = text.replace(/("host"\s*:\s*")127\.0\.0\.1(?::80)?(")/g, `$1${publicHost}$2`);
      }
      const output = text !== null ? Buffer.from(text) : body;
      const outHeaders = { ...response.headers, 'content-length': output.length };
      delete outHeaders['transfer-encoding'];
      if (outHeaders.location) outHeaders.location = outHeaders.location.replace(/https?:\/\/127\.0\.0\.1(?::80)?/gi, publicOrigin);
      res.writeHead(response.statusCode || 502, outHeaders);
      res.end(output);
    });
  });
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Local web server unavailable'); });
  req.pipe(upstream);
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const targetPort = routes[new URL(req.url, 'http://gateway').pathname];
  if (!targetPort) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => {
    const tcp = net.connect(targetPort, '127.0.0.1');
    const close = () => { try { tcp.destroy(); } catch {} try { ws.close(); } catch {} };
    tcp.on('data', data => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
    tcp.on('error', close); tcp.on('close', () => { if (ws.readyState === WebSocket.OPEN) ws.close(); });
    ws.on('message', data => { if (tcp.writable) tcp.write(data); });
    ws.on('close', close); ws.on('error', close);
  });
});
server.listen(listenPort, '127.0.0.1', () => console.log(`Gateway listening on http://127.0.0.1:${listenPort}`));
