import { musicHttpHandler } from '../../server/music/http.mjs';

function send(response, result) {
  for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}

export default async function handler(request, response) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const clientId = forwarded || request.socket?.remoteAddress || 'unknown';
  send(response, await musicHttpHandler({ method: request.method, body: request.body, clientId }));
}

