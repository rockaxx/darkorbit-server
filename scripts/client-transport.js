const http = require('http');
const https = require('https');
const net = require('net');
const zlib = require('zlib');
const WebSocket = require('ws');

// The legacy SWFs construct HTTP URLs themselves. Keep all Flash traffic on a
// single loopback origin and carry it to the server over HTTPS / WSS.
const address = '127.0.0.2';
const localOrigin = `http://${address}`;
function rewrite(text, remote) {
  return text.split(remote.origin).join(localOrigin)
    .split(remote.hostname).join(address)
    .replace(/127\.0\.0\.1/g, address);
}
async function startTransport(origin, log = () => {}) {
  const remote = new URL(origin);
  const servers = []; const connections = new Set();
  const close = () => { for (const connection of connections) connection.destroy(); for (const server of servers) server.close(); };
  const bind = async (server, port) => {
    servers.push(server);
    server.on('connection', socket => { connections.add(socket); socket.once('close', () => connections.delete(socket)); });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, address, () => { server.removeListener('error', reject); resolve(); });
    });
    server.on('error', error => log(`Listener ${port}: ${error.message}`));
    log(`Ready ${address}:${port}`);
  };
  try {
    const web = http.createServer((req, res) => {
      const headers = { ...req.headers, host: remote.host, 'accept-encoding': 'identity' };
      delete headers.connection;
      if (headers.origin) headers.origin = remote.origin;
      if (headers.referer) headers.referer = headers.referer.replace(localOrigin, remote.origin);
      // Flash inventory emits //swf_global/...; it is a path, not a new host.
      const target = new URL(remote.origin + '/' + req.url.replace(/^\/+/, ''));
      const upstream = (remote.protocol === 'https:' ? https : http).request(target, { method: req.method, headers }, response => {
        const out = { ...response.headers };
        delete out['transfer-encoding'];
        if (out.location) out.location = rewrite(out.location, remote);
        if (out['set-cookie']) out['set-cookie'] = out['set-cookie'].map(cookie => cookie.replace(/;\s*secure\b/ig, '').replace(/;\s*domain=[^;]+/ig, '').replace(/SameSite=None/ig, 'SameSite=Lax'));
        const type = String(out['content-type'] || '');
        if (!/text|javascript|json|xml|css/i.test(type)) { res.writeHead(response.statusCode, out); response.pipe(res); return; }
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          try {
            let body = Buffer.concat(chunks);
            if (out['content-encoding'] === 'gzip') body = zlib.gunzipSync(body);
            else if (out['content-encoding'] === 'br') body = zlib.brotliDecompressSync(body);
            else if (out['content-encoding'] === 'deflate') body = zlib.inflateSync(body);
            body = Buffer.from(rewrite(body.toString('utf8'), remote));
            delete out['content-encoding']; delete out.etag;
            out['content-length'] = body.length;
            res.writeHead(response.statusCode, out); res.end(body);
          } catch (error) { log(`Response decode failed: ${error.message}`); res.writeHead(502); res.end('Server response could not be read'); }
        });
      });
      upstream.on('error', error => { log(`HTTP ${req.url.split('?')[0]}: ${error.message}`); if (!res.headersSent) res.writeHead(502); res.end('Server connection failed'); });
      req.pipe(upstream);
    });
    await bind(web, 80);
    for (const [port, route] of [[8080, '/socket/game'], [9338, '/socket/chat']]) {
      await bind(net.createServer(tcp => {
        log(`Flash connected ${port}`);
        const ws = new WebSocket(remote.origin.replace(/^http/, 'ws') + route);
        tcp.pause();
        ws.once('open', () => { log(`Tunnel connected ${route}`); tcp.resume(); });
        tcp.on('data', bytes => { if (ws.readyState === WebSocket.OPEN) ws.send(bytes); });
        ws.on('message', bytes => { if (tcp.writable) tcp.write(bytes); });
        tcp.on('close', () => ws.terminate()); tcp.on('error', () => ws.terminate());
        ws.on('close', () => tcp.destroy()); ws.on('error', error => { log(`Socket: ${error.message}`); tcp.destroy(); });
      }), port);
    }
    await bind(net.createServer(tcp => {
      tcp.setTimeout(5000, () => tcp.destroy());
      tcp.once('data', data => {
        if (data.toString().startsWith('<policy-file-request/>')) tcp.end('<cross-domain-policy><allow-access-from domain="127.0.0.2" to-ports="8080,9338" /></cross-domain-policy>\0');
        else tcp.destroy();
      });
    }), 843);
    return { origin: localOrigin, close };
  } catch (error) { close(); throw error; }
}
module.exports = { startTransport, rewrite };
