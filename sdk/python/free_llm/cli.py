import os
import sys
import time
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from .registry import RegistryManager
from .router import FreeLLMRouter
from .client import FreeLLMClient

console = Console()

@click.group()
def main():
    """Free LLM Hub CLI - Manage and route across free LLM providers."""
    pass

@main.command()
def status():
    """Display the status of tracked free providers and configured keys."""
    router = FreeLLMRouter()
    configured = {p.id for p in router.get_configured_providers()}

    table = Table(title="🌟 Tracked Free LLM Providers", show_header=True, header_style="bold cyan")
    table.add_column("Provider", style="bold")
    table.add_column("Access Type")
    table.add_column("Card Needed?")
    table.add_column("Env Var")
    table.add_column("Configured?", justify="center")
    table.add_column("Models Count", justify="right")

    for p in sorted(router.registry.data.providers, key=lambda x: x.name):
        is_cfg = "✅ Ready" if p.id in configured else "[dim]❌ Missing Key[/dim]"
        card = "❌ No" if not p.tier.requires_credit_card else "⚠️ Yes"
        env_str = p.api.env_var if p.api.env_var else "[italic green]Zero Auth[/italic green]"

        table.add_row(
            p.name,
            p.tier.type.replace("_", " ").title(),
            card,
            env_str,
            is_cfg,
            str(len(p.models))
        )

    console.print(table)
    console.print(f"\n[green]Ready providers with active access: {len(configured)}[/green] / {len(router.registry.data.providers)}")
    if len(configured) == 0:
        console.print("[yellow]Tip: Copy .env.example to .env and insert your free API keys.[/yellow]")

@main.command()
def sync():
    """Sync the local registry cache with the latest Git/CDN repository."""
    with console.status("[bold green]Syncing latest registry from remote Git repository..."):
        reg = RegistryManager(auto_sync=False)
        try:
            reg.sync()
            console.print(f"[bold green]✓[/bold green] Successfully synced registry! Loaded {len(reg.data.providers)} providers and {len(reg.data.alias_routing_table)} model aliases.")
        except Exception as e:
            console.print(f"[bold red]✗[/bold red] Failed to sync remote: {e}")

@main.command()
@click.option("--host", default="0.0.0.0", help="Host interface to bind")
@click.option("--port", default=8080, help="Port to listen on")
def serve(host: str, port: int):
    """Start the OpenAI-compatible local proxy server."""
    from .proxy.server import start_server
    console.print(Panel(f"[bold green]Starting Free LLM Proxy Gateway[/bold green]\n\n"
                        f"Listening on: [cyan]http://{host}:{port}/v1[/cyan]\n"
                        f"OpenAI Base URL: [cyan]http://localhost:{port}/v1[/cyan]\n"
                        f"API Key: [dim]free-llm (or any string)[/dim]",
                        title="Free LLM Gateway", expand=False))
    start_server(host=host, port=port)

@main.command()
@click.option("--model", default="auto", help="Model name or alias to test (e.g. llama-3.3-70b, gpt-4o-mini, auto)")
@click.option("--prompt", default="What is the speed of light in vacuum in 1 sentence?", help="Prompt to test")
def test(model: str, prompt: str):
    """Send a test query to verify free provider routing."""
    console.print(f"[cyan]Testing model '{model}' with prompt: '{prompt}'...[/cyan]")
    client = FreeLLMClient()

    start = time.time()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        elapsed = time.time() - start
        console.print(Panel(
            f"[bold]Response:[/bold]\n{response.choices[0].message.content}\n\n"
            f"[dim]Provider: [bold cyan]{response.provider_name} ({response.provider_id})[/bold cyan] | "
            f"Model: {response.model} | Latency: {elapsed:.2f}s[/dim]",
            title="✅ Query Successful",
            border_style="green"
        ))
    except Exception as e:
        console.print(Panel(f"[bold red]Error:[/bold red] {e}", title="❌ Test Failed", border_style="red"))

if __name__ == "__main__":
    main()
