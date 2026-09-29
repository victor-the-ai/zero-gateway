#!/usr/bin/env node
import { Command } from "commander";
import { ZeroGatewayRouter } from "./router.js";
import { ZeroGatewayClient } from "./client.js";
import { RegistryManager } from "./registry.js";
import { startProxyServer } from "./proxy.js";

const program = new Command();

program
  .name("zerogateway")
  .description("Zerogateway CLI - Manage and route across free LLM providers.")
  .version("0.1.0");

program
  .command("status")
  .description("Display the status of tracked free providers and configured keys.")
  .action(() => {
    const router = new ZeroGatewayRouter();
    const configured = new Set(router.getConfiguredProviders().map((p) => p.id));
    const providers = [...router.registry.data.providers].sort((a, b) => a.name.localeCompare(b.name));

    console.log("\n🌟 Tracked Free LLM Providers (Zerogateway)\n");
    console.log(
      `${"Provider".padEnd(25)} ${"Access Type".padEnd(20)} ${"Card?".padEnd(8)} ${"Env Var".padEnd(22)} ${"Status".padEnd(16)} Models`
    );
    console.log("-".repeat(100));

    for (const p of providers) {
      const isCfg = configured.has(p.id) ? "✅ Ready" : "❌ Missing Key";
      const card = p.tier.requires_credit_card ? "⚠️ Yes" : "❌ No";
      const env = p.api.env_var || "Zero Auth";

      console.log(
        `${p.name.padEnd(25)} ${p.tier.type.padEnd(20)} ${card.padEnd(8)} ${env.padEnd(22)} ${isCfg.padEnd(16)} ${p.models.length}`
      );
    }

    console.log("\n" + `Ready providers with active access: ${configured.size} / ${providers.length}`);
    if (configured.size === 0) {
      console.log("Tip: Copy .env.example to .env and insert your free API keys.\n");
    }
  });

program
  .command("sync")
  .description("Sync the local registry cache with the latest Git/CDN repository.")
  .action(async () => {
    const reg = new RegistryManager(undefined, false);
    console.log("Syncing latest registry from remote Git repository...");
    try {
      await reg.sync();
      console.log(`✓ Successfully synced registry! Loaded ${reg.data.providers.length} providers.`);
    } catch (err: any) {
      console.error(`✗ Failed to sync remote: ${err.message}`);
    }
  });

program
  .command("serve")
  .description("Start the OpenAI-compatible local proxy server.")
  .option("-p, --port <number>", "Port to listen on", "8080")
  .option("-h, --host <string>", "Host interface to bind", "0.0.0.0")
  .action((options) => {
    const port = parseInt(options.port, 10);
    const host = options.host;

    startProxyServer({ port, host });
    console.log(`\n🚀 Starting Zerogateway Proxy`);
    console.log(`   Listening on:       http://${host}:${port}/v1`);
    console.log(`   OpenAI Base URL:    http://localhost:${port}/v1`);
    console.log(`   API Key:            zerogateway (or any string)\n`);
  });

program
  .command("test")
  .description("Send a test query to verify free provider routing.")
  .option("-m, --model <string>", "Model name or alias to test", "auto")
  .option("-p, --prompt <string>", "Prompt to test", "What is the speed of light in vacuum in 1 sentence?")
  .action(async (options) => {
    console.log(`Testing model '${options.model}' with prompt: '${options.prompt}'...`);
    const client = new ZeroGatewayClient();
    const start = Date.now();

    try {
      const response = await client.chat.completions.create({
        model: options.model,
        messages: [{ role: "user", content: options.prompt }],
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log("\n✅ Query Successful:");
      console.log(`Response: ${response.choices[0]?.message.content}\n`);
      console.log(`Provider: ${response.provider_name} (${response.provider_id}) | Model: ${response.model} | Latency: ${elapsed}s\n`);
    } catch (err: any) {
      console.error(`\n❌ Test Failed: ${err.message}\n`);
    }
  });

program.parse(process.argv);
