import { defineConfig, loadEnv, Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

// In production, Vercel runs api/gemini.ts as a server function. This plugin runs the same
// file inside `npm run dev`, so the app works locally without the Vercel CLI.
function localApi(): Plugin {
  return {
    name: 'ask-dharma-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/gemini', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const handlers = await server.ssrLoadModule('/api/gemini.ts');
          const handler = handlers[req.method || 'GET'];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.end();
            return;
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);

          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            if (value === undefined || ['connection', 'content-length', 'transfer-encoding'].includes(name)) continue;
            headers.set(name, Array.isArray(value) ? value.join(', ') : value);
          }

          const response: Response = await handler(
            new Request(`http://${req.headers.host}/api/gemini`, {
              method: req.method,
              headers,
              body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
            })
          );

          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          if (response.body) {
            for await (const chunk of response.body as any) res.write(chunk);
          }
          res.end();
        } catch (err) {
          server.config.logger.error(`[Ask DHARMA] Local API error: ${err}`);
          res.statusCode = 500;
          res.end('Local API error');
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  if (command === 'serve') {
    // Make the key from .env.local available to the local API (it is never sent to the browser).
    process.env.GEMINI_API_KEY ||= env.GEMINI_API_KEY || env.API_KEY || '';
    if (!process.env.GEMINI_API_KEY) {
      console.warn(
        "\n[Ask DHARMA] GEMINI_API_KEY is not set. Chat, document scan and voice will not work.\n" +
        "Add GEMINI_API_KEY=<your key> to .env.local.\n"
      );
    }
  }

  return {
    plugins: [react(), localApi()],
    server: {
      port: 3000
    }
  }
})
