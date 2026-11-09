import { createServer } from "node:http";
import { Readable } from "node:stream";
export function createHttpServer(
  handler: (request: Request, ip: string) => Promise<Response>,
  origin: string,
) {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers))
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      const method = incoming.method ?? "GET";
      const init: RequestInit & { duplex?: string } = { method, headers };
      if (method !== "GET" && method !== "HEAD") {
        init.body = Readable.toWeb(incoming) as ReadableStream;
        init.duplex = "half";
      }
      const response = await handler(
        new Request(new URL(incoming.url ?? "/", origin), init),
        incoming.socket.remoteAddress ?? "unknown",
      );
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent)
        outgoing.writeHead(503, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
      outgoing.end('{"error":{"code":"temporarily_unavailable"}}');
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 60;
  return server;
}
