import { test, describe } from "node:test";
import assert from "node:assert";
import {
  RegistryManager,
  ZeroGatewayRouter,
  ZeroGatewayClient,
  extractResetWindow,
} from "../dist/index.js";

describe("RegistryManager", () => {
  test("loads bundled registry data successfully", () => {
    const reg = new RegistryManager(undefined, false);
    assert.ok(reg.data.providers.length >= 8);
    assert.strictEqual(reg.data.version, "1.0.0");
  });

  test("resolves aliases correctly", () => {
    const reg = new RegistryManager(undefined, false);
    const matches = reg.getProvidersForAlias("llama-3.3-70b");
    assert.ok(matches.length >= 2);
  });

  test("retrieves all models", () => {
    const reg = new RegistryManager(undefined, false);
    const models = reg.getAllModels();
    assert.ok(models.length >= 20);
  });
});

describe("extractResetWindow", () => {
  test("extracts standard retry-after header", () => {
    const headers = new Headers({ "retry-after": "45" });
    const reset = extractResetWindow(headers);
    assert.strictEqual(reset, 45);
  });

  test("extracts Google Gemini retryDelay from body", () => {
    const headers = new Headers();
    const body = {
      error: {
        message: "Resource exhausted",
        details: [{ retryDelay: "30s" }],
      },
    };
    const reset = extractResetWindow(headers, body);
    assert.strictEqual(reset, 30);
  });

  test("falls back to defaultCooldown", () => {
    const headers = new Headers();
    const reset = extractResetWindow(headers, null, 75.0);
    assert.strictEqual(reset, 75.0);
  });
});

describe("ZeroGatewayRouter", () => {
  test("defaults keyRotation to false and providerRotation to true", () => {
    const router = new ZeroGatewayRouter();
    assert.strictEqual(router.enableKeyRotation, false);
    assert.strictEqual(router.enableProviderRotation, true);
  });

  test("resolves candidates for known models", () => {
    const router = new ZeroGatewayRouter();
    // Pollinations is zero-auth and always configured
    const candidates = router.resolveCandidates("auto");
    assert.ok(candidates.length >= 1);
  });

  test("cascades across providers on 429", async () => {
    const router = new ZeroGatewayRouter();
    const groq = router.registry.getProvider("groq")!;
    const cerebras = router.registry.getProvider("cerebras")!;

    // Override candidates
    router.resolveCandidates = () => [
      [groq, "llama-3.3-70b-versatile"],
      [cerebras, "llama3.3-70b"],
    ];

    let callCount = 0;
    const mockFetch = (async (url: string | URL | Request) => {
      callCount++;
      if (callCount === 1) {
        return new Response("Rate limit", {
          status: 429,
          headers: { "retry-after": "60" },
        });
      }
      return new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          choices: [{ message: { role: "assistant", content: "Hello from Cerebras!" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await router.executeChatCompletion(
      {
        model: "llama-3.3-70b",
        messages: [{ role: "user", content: "Hi" }],
      },
      { fetchFn: mockFetch }
    );

    assert.strictEqual(callCount, 2);
    assert.strictEqual(res.choices[0].message.content, "Hello from Cerebras!");
    assert.strictEqual(res._zerogateway_meta?.provider_id, "cerebras");
    assert.strictEqual(router.isThrottled("groq"), true);
  });

  test("swaps API keys on 429 when key rotation is enabled", async () => {
    const router = new ZeroGatewayRouter({
      enableKeyRotation: true,
      apiKeys: {
        google_ai_studio: ["key_A", "key_B"],
      },
    });

    const google = router.registry.getProvider("google_ai_studio")!;
    router.resolveCandidates = () => [[google, "gemini-2.0-flash"]];

    let callCount = 0;
    const attemptedKeys: string[] = [];

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      callCount++;
      const auth = (init?.headers as Record<string, string>)?.["Authorization"] || "";
      attemptedKeys.push(auth);

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Quota exceeded",
              details: [{ retryDelay: "45s" }],
            },
          }),
          { status: 429, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          id: "chatcmpl-gemini",
          choices: [{ message: { role: "assistant", content: "Success with key B" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await router.executeChatCompletion(
      {
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: "Hello" }],
      },
      { fetchFn: mockFetch }
    );

    assert.strictEqual(callCount, 2);
    assert.strictEqual(attemptedKeys[0], "Bearer key_A");
    assert.strictEqual(attemptedKeys[1], "Bearer key_B");
    assert.strictEqual(res.choices[0].message.content, "Success with key B");
    assert.strictEqual(router.isKeyThrottled("google_ai_studio", "key_A"), true);
    assert.strictEqual(router.isKeyThrottled("google_ai_studio", "key_B"), false);
  });

  test("swaps API keys on expired key (401)", async () => {
    const router = new ZeroGatewayRouter({
      enableKeyRotation: true,
      apiKeys: {
        google_ai_studio: ["expired_key", "good_key"],
      },
    });

    const google = router.registry.getProvider("google_ai_studio")!;
    router.resolveCandidates = () => [[google, "gemini-2.0-flash"]];

    let callCount = 0;
    const mockFetch = (async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: { message: "Invalid key" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "Good response" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await router.executeChatCompletion(
      {
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: "Hello" }],
      },
      { fetchFn: mockFetch }
    );

    assert.strictEqual(callCount, 2);
    assert.strictEqual(res.choices[0].message.content, "Good response");
    assert.strictEqual(router.isKeyThrottled("google_ai_studio", "expired_key"), true);
  });

  test("respects enableProviderRotation=false", async () => {
    const router = new ZeroGatewayRouter({ enableProviderRotation: false });
    const groq = router.registry.getProvider("groq")!;
    const cerebras = router.registry.getProvider("cerebras")!;

    router.resolveCandidates = () => [
      [groq, "llama-3.3-70b-versatile"],
      [cerebras, "llama3.3-70b"],
    ];

    let callCount = 0;
    const mockFetch = (async () => {
      callCount++;
      return new Response("Rate limit", { status: 429 });
    }) as unknown as typeof fetch;

    await assert.rejects(
      async () => {
        await router.executeChatCompletion(
          {
            model: "llama-3.3-70b",
            messages: [{ role: "user", content: "Hi" }],
          },
          { fetchFn: mockFetch }
        );
      },
      /All candidate free providers\/keys failed/
    );

    assert.strictEqual(callCount, 1);
  });
});

describe("ZeroGatewayClient", () => {
  test("creates completion via client.chat.completions.create", async () => {
    const client = new ZeroGatewayClient();
    const poll = client.router.registry.getProvider("pollinations")!;
    client.router.resolveCandidates = () => [[poll, "openai"]];

    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "Client working!" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    client.router.executeChatCompletion = async (req) => {
      return {
        choices: [{ index: 0, message: { role: "assistant", content: "Client working!" } }],
        provider_id: "pollinations",
        provider_name: "Pollinations AI",
      };
    };

    const res = await client.chat.completions.create({
      model: "auto",
      messages: [{ role: "user", content: "Test" }],
    });

    assert.strictEqual(res.choices[0].message.content, "Client working!");
  });
});
