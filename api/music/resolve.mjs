import { musicHttpHandler } from '../../server/music/http.mjs';

function send(response, result) {
  for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
  response.status(result.status).json(result.body);
}

export default async function handler(request, response) {
  const clientId = request.socket?.remoteAddress || request.headers['x-vercel-id'] || 'serverless-instance';
  send(response, await musicHttpHandler({ method: request.method, headers: request.headers, body: request.body, clientId }));
}
