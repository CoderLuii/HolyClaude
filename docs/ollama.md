# Using HolyClaude with Ollama

HolyClaude can run with [Ollama](https://ollama.com) instead of an Anthropic subscription. Since [January 2026](https://ollama.com/blog/claude), Ollama exposes an Anthropic-compatible API endpoint, so Claude Code connects to it natively.

This means you can use HolyClaude with local models (free, unlimited) or Ollama Cloud models (freemium) without a Claude Max/Pro plan or Anthropic API key.

## Prerequisites

- [Ollama](https://ollama.com/download) installed on your host machine (or another server on your network)
- At least one model pulled (e.g., `ollama pull qwen3-coder`)
- For cloud models: an Ollama account (`ollama signin`)

## Setup

Use `docker-compose.full.yaml` as the supported Ollama setup path and add the Ollama-specific lines below:

```yaml
services:
  holyclaude:
    # Linux only — required if you want to use host.docker.internal
    extra_hosts:
      - "host.docker.internal:host-gateway"

    environment:
      - ANTHROPIC_AUTH_TOKEN=ollama
      - ANTHROPIC_BASE_URL=http://host.docker.internal:11434
```

- `ANTHROPIC_AUTH_TOKEN=ollama` is required by Claude Code but not validated by Ollama. Any string works.
- `ANTHROPIC_BASE_URL` points to your Ollama server. Use `host.docker.internal` to reach the host machine from inside the container, or your server's IP address (e.g., `http://192.168.1.100:11434`).
- This is the supported HolyClaude path for Ollama. Do not rely on `OLLAMA_HOST` alone for Claude Code.

> **Linux users:** `host.docker.internal` is not available by default on Linux Docker. Keep the `extra_hosts` line above, or replace `ANTHROPIC_BASE_URL` with your host's LAN IP address directly.

Start the container:

```bash
docker compose -f docker-compose.full.yaml up -d
```

## Selecting a Model

Once inside HolyClaude, switch to an Ollama model using the `/model` command:

```
/model qwen3-coder
```

### Recommended Models

**Local models** (run on your hardware, unlimited usage):

| Model | Size | Notes |
|-------|------|-------|
| `qwen3-coder` | 30B | Excellent for coding, needs 24GB+ VRAM |
| `gpt-oss:20b` | 20B | Strong general purpose |

**Cloud models** (run on Ollama's infrastructure, requires `ollama signin`):

| Model | Notes |
|-------|-------|
| `qwen3.5:cloud` | High performance |
| `glm-4.7:cloud` | High performance |
| `minimax-m2.5:cloud` | Fast |

Cloud models are identified by the `:cloud` suffix. They require an Ollama account but have a free tier.

Models should have at least 32K context length for best results with Claude Code.

## Ollama Cloud

If you don't have a GPU or want to try HolyClaude without local hardware, Ollama Cloud runs models remotely.

1. Install Ollama on your computer
2. Sign in: `ollama signin`
3. Use any cloud model (e.g., `qwen3.5:cloud`)

**Pricing:**

| Plan | Price | Cloud Usage |
|------|-------|-------------|
| Free | $0 | Light usage |
| Pro | $20/mo | 50x Free |
| Max | $100/mo | 250x Free |

Local model usage is always unlimited on all plans.

## Switching from Anthropic

If you previously used HolyClaude with an Anthropic subscription and want to switch to Ollama:

1. Add the `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_BASE_URL` environment variables to your compose file
2. Restart with the same Compose file:

   ```bash
   docker compose -f docker-compose.full.yaml down
   docker compose -f docker-compose.full.yaml up -d
   ```

No data deletion is needed. The environment variables override previous authentication.

## Limitations

Ollama's Anthropic API compatibility covers most features Claude Code needs, but some are not supported:

- Prompt caching (`cache_control`)
- PDF document processing
- Token counting endpoint
- Image URLs (base64 images work)

For full details, see [Ollama's Anthropic API documentation](https://docs.ollama.com/api/anthropic-compatibility).

## Troubleshooting

**Claude Code can't connect to Ollama:**
- Verify Ollama is running: `curl http://localhost:11434` on your host (should return "Ollama is running")
- If Ollama is on the Docker host, make sure `ANTHROPIC_BASE_URL` matches the address you can actually reach from inside the container
- On Linux, keep `extra_hosts: ["host.docker.internal:host-gateway"]` or use your host's LAN IP instead of `host.docker.internal`
- If Ollama is on a different machine, use that machine's IP instead of `host.docker.internal`
- Ensure Ollama is listening on the right interface, for example: `OLLAMA_HOST=0.0.0.0 ollama serve`

**Web Terminal button missing when not logged in to Claude:**
- This is a known CloudCLI UI limitation. The Web Terminal plugin requires authentication to be active. Use `docker exec -it holyclaude bash` as a workaround.

**Model not found:**
- Pull the model first on your Ollama host: `ollama pull qwen3-coder`
- For cloud models, sign in first: `ollama signin`
