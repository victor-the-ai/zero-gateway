import http from "http";
import fs from "fs";
import path from "path";
import { ZeroGatewayRouter } from "./router.js";
import { ChatCompletionRequest } from "./models.js";

export function startProxyServer(options: {
  port?: number;
  host?: string;
  router?: ZeroGatewayRouter;
} = {}): http.Server {
  const host = options.host || "0.0.0.0";
  const port = options.port || 8080;
  const routerInstance = options.router || new ZeroGatewayRouter();

  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // 1. Root / and landing page
    if (pathname === "/" && req.method === "GET") {
      const accept = req.headers["accept"] || "";
      if (accept.includes("text/html")) {
        const landingPaths = [
          path.resolve(__dirname, "data", "index.html"),
          path.resolve(__dirname, "..", "data", "index.html"),
          path.resolve(__dirname, "..", "..", "data", "index.html"),
          path.resolve(__dirname, "..", "..", "..", "docs", "index.html"),
          path.resolve(__dirname, "..", "..", "..", "..", "docs", "index.html"),
          path.resolve(process.cwd(), "docs", "index.html"),
        ];

        for (const p of landingPaths) {
          if (fs.existsSync(p)) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(fs.readFileSync(p, "utf-8"));
            return;
          }
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        service: "Zerogateway Proxy",
        status: "online",
        documentation: "/docs",
        landing_page: "/index.html",
        active_providers: routerInstance.getConfiguredProviders().map((p) => p.name),
      }));
      return;
    }

    // 2. Health
    if (pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: Date.now() / 1000 }));
      return;
    }

    // 3. Status
    if (pathname === "/status" && req.method === "GET") {
      const configured = routerInstance.getConfiguredProviders();
      const activeCooldowns: Record<string, string> = {};
      for (const [pk, until] of routerInstance.keyThrottledUntil.entries()) {
        if (until > Date.now()) {
          const remainingSec = Math.max(0, Math.round((until - Date.now()) / 1000));
          activeCooldowns[pk] = `resets in ${remainingSec}s`;
        }
      }

      const statsObj: Record<string, any> = {};
      for (const [k, v] of routerInstance.stats.entries()) {
        statsObj[k] = v;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        configured_providers_count: configured.length,
        key_rotation_enabled: routerInstance.enableKeyRotation,
        provider_rotation_enabled: routerInstance.enableProviderRotation,
        configured_providers: configured.map((p) => ({
          id: p.id,
          name: p.name,
          tier: p.tier.type,
          auth_type: p.tier.auth_type,
          models_count: p.models.length,
          keys_count: routerInstance.getProviderKeys(p).length,
          is_throttled: routerInstance.isThrottled(p.id),
        })),
        stats: statsObj,
        active_cooldowns: activeCooldowns,
      }));
      return;
    }

    // 4. Models
    if (pathname === "/v1/models" && req.method === "GET") {
      const data: any[] = [];
      const seen = new Set<string>();

      const aliases = ["auto", "fast-smart", "llama-3.3-70b", "llama-3.1-8b", "gpt-4o-mini", "gemini-flash"];
      for (const a of aliases) {
        data.push({
          id: a,
          object: "model",
          created: 1700000000,
          owned_by: "zerogateway",
          permission: [],
          root: a,
          parent: null,
        });
        seen.add(a);
      }

      for (const p of routerInstance.getConfiguredProviders()) {
        for (const m of p.models) {
          if (!seen.has(m.id)) {
            data.push({
              id: m.id,
              object: "model",
              created: 1700000000,
              owned_by: p.id,
              permission: [],
              root: m.id,
              parent: null,
            });
            seen.add(m.id);
          }
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ object: "list", data }));
      return;
    }

    // 5. Chat completions
    if (pathname === "/v1/chat/completions" && req.method === "POST") {
      let bodyStr = "";
      req.on("data", (chunk) => { bodyStr += chunk; });
      req.on("end", async () => {
        try {
          const payload = JSON.parse(bodyStr) as ChatCompletionRequest;

          // Header overrides
          const keyRotHdr = req.headers["x-enable-key-rotation"];
          const provRotHdr = req.headers["x-enable-provider-rotation"];

          const origKeyRot = routerInstance.enableKeyRotation;
          const origProvRot = routerInstance.enableProviderRotation;

          if (typeof keyRotHdr === "string") {
            routerInstance.enableKeyRotation = keyRotHdr.toLowerCase() === "true" || keyRotHdr === "1";
          }
          if (typeof provRotHdr === "string") {
            routerInstance.enableProviderRotation = provRotHdr.toLowerCase() === "true" || provRotHdr === "1";
          }

          try {
            if (payload.stream) {
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
              });

              for await (const chunk of routerInstance.streamChatCompletion(payload)) {
                res.write(chunk);
              }
              res.end();
            } else {
              const respData = await routerInstance.executeChatCompletion(payload);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(respData));
            }
          } finally {
            routerInstance.enableKeyRotation = origKeyRot;
            routerInstance.enableProviderRotation = origProvRot;
          }
        } catch (err: any) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: String(err.message || err) } }));
        }
      });
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: `Not found: ${pathname}` } }));
  });

  server.listen(port, host, () => {
    // Started
  });

  return server;
}
