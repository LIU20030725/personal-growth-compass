import { musicHttpHandler } from './http.mjs';

function readBody(request, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) { reject(Object.assign(new Error('payload too large'), { status: 413 })); request.destroy(); return; }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function emotionMusicResolverPlugin() {
  function mount(server) {
    server.middlewares.use('/api/music/resolve', async (request, response) => {
      try {
        const body = await readBody(request);
        const result = await musicHttpHandler({ method: request.method, body, clientId: request.socket.remoteAddress || 'local' });
        response.statusCode = result.status;
        for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
        response.end(JSON.stringify(result.body));
      } catch (error) {
        response.statusCode = error?.status || 500;
        response.setHeader('content-type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ ok: false, error: { code: 'INVALID_REQUEST', message: error?.status === 413 ? '请求内容过大' : '无法读取请求' } }));
      }
    });
  }
  return {
    name: 'emotion-music-resolver',
    configureServer: mount,
    configurePreviewServer: mount
  };
}
