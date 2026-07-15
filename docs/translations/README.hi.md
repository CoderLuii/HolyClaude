🌍 [English](../../README.md) | [Español](README.es.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | **हिन्दी** | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

# <img src="https://github.com/CoderLuii/HolyClaude/blob/master/assets/logo.png?raw=true" alt="HolyClaude" width="39" valign="bottom"> <a name="top"></a>HolyClaude

<div align="center">
  <img src="https://github.com/CoderLuii/HolyClaude/blob/master/assets/hero.png?raw=true" alt="HolyClaude Banner" width="100%" />
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Pulls](https://badgen.net/docker/pulls/coderluii/holyclaude?icon=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![Full Image](https://img.shields.io/docker/image-size/coderluii/holyclaude/latest?label=full&color=blue&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![Slim Image](https://img.shields.io/docker/image-size/coderluii/holyclaude/slim?label=slim&color=green&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
<br>
[![GitHub Stars](https://img.shields.io/github/stars/CoderLuii/HolyClaude?style=social)](https://github.com/CoderLuii/HolyClaude)
[![Twitter Follow](https://img.shields.io/twitter/follow/CoderLuii?style=social)](https://x.com/CoderLuii)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)
[![Website](https://img.shields.io/badge/website-holyclaude.coderluii.dev-orange?logo=astro)](https://holyclaude.coderluii.dev)
[![GitHub Release](https://img.shields.io/github/v/release/CoderLuii/HolyClaude?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/CoderLuii/HolyClaude/releases)
[![Issues](https://img.shields.io/github/issues/CoderLuii/HolyClaude?color=ff80eb&labelColor=black&style=flat-square)](https://github.com/CoderLuii/HolyClaude/issues)
[![Contributors](https://img.shields.io/github/contributors/CoderLuii/HolyClaude?color=c4f042&labelColor=black&style=flat-square)](https://github.com/CoderLuii/HolyClaude/graphs/contributors)

### कॉन्फ़िगर करना बंद करें। बनाना शुरू करें।

एक कमांड। पूरा AI डेवलपमेंट वर्कस्टेशन। Claude Code, वेब UI, हेडलेस ब्राउज़र, 8 AI CLIs, 50+ डेव टूल्स — कंटेनराइज़्ड और तैयार।

**आप इसे मैन्युअली सेट अप करने में 2 घंटे लगाने वाले थे। या बस `docker compose up` कर सकते हैं।**

**आपकी मौजूदा Claude Code सब्सक्रिप्शन के साथ काम करता है।** Max/Pro प्लान, API key — जो भी आपके पास है, यह बस काम करता है।

---

## यह क्या है?

आप इसे जानते हैं। आप Claude Code चाहते हैं। लेकिन आप इसे ब्राउज़र में भी चाहते हैं। स्क्रीनशॉट और टेस्टिंग के लिए हेडलेस ब्राउज़र के साथ। Playwright कॉन्फ़िगर के साथ। हर AI CLI के साथ। TypeScript, Python, डिप्लॉयमेंट टूल्स, डेटाबेस क्लाइंट्स, GitHub CLI के साथ।

तो आप चीजें इंस्टॉल करना शुरू करते हैं। एक-एक करके। फिर Chromium लॉन्च नहीं होता क्योंकि Docker की शेयर्ड मेमोरी 64MB है। फिर Xvfb कॉन्फ़िगर नहीं है। फिर कंटेनर के अंदर का UID आपके होस्ट से मेल नहीं खाता और सब कुछ permission denied है। फिर आपको पता चलता है कि Claude Code का इंस्टॉलर रुक जाता है जब WORKDIR root-owned हो। फिर SQLite आपके NAS माउंट पर लॉक हो जाता है। फिर—

**HolyClaude वह कंटेनर है जो मैंने उन सभी समस्याओं को हल करने के बाद बनाया।**

मैं इसे हफ्तों से अपने सर्वर पर रोज़ाना चला रहा हूं। हर बग को हिट किया गया, डायग्नोज़ किया गया, और ठीक किया गया। हर एज केस को संभाला गया। हर "Docker में यह क्यों काम नहीं करता" का जवाब दिया गया।

आप इसे पुल करते हैं। आप इसे चलाते हैं। आप अपना ब्राउज़र खोलते हैं। आप बनाते हैं।

### :credit_card: अपनी मौजूदा सब्सक्रिप्शन का उपयोग करें

**यह असली Claude Code CLI चलाता है।** कोई wrapper नहीं। कोई proxy नहीं। कोई नकल नहीं।

आपका मौजूदा Anthropic अकाउंट सीधे काम करता है:
- **Claude Max/Pro प्लान** — CloudCLI वेब UI के ज़रिए authenticate करें (OAuth), डेस्कटॉप Claude Code जैसा ही
- **Anthropic API key** — वेब UI में अपनी API key डालें, हमेशा की तरह वही बिलिंग
- **कोई अतिरिक्त लागत नहीं** — HolyClaude मुफ़्त और ओपन सोर्स है। आप Anthropic को सिर्फ उसी चीज़ के लिए पे करते हैं जो आप use करते हैं, जैसा आप पहले से करते हैं।

> HolyClaude आपके credentials को नहीं छूता। वे आपके bind-mounted volume (`./data/claude/`) में locally स्टोर होते हैं, वैसे ही जैसे bare metal पर होते।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## सामग्री तालिका

| | अनुभाग |
|---|---|
| :zap: | [त्वरित शुरुआत](#zap-quick-start) |
| :computer: | [प्लेटफ़ॉर्म समर्थन](#computer-platform-support) |
| :star2: | [HolyClaude क्यों](#star2-why-holyclaude) |
| :credit_card: | [सब्सक्रिप्शन और प्रमाणीकरण](#credit_card-subscription--authentication) |
| :package: | [इमेज वेरिएंट](#package-image-variants) |
| :whale: | [Docker Compose — त्वरित](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — पूर्ण](#whale2-docker-compose--full) |
| :wrench: | [पर्यावरण वेरिएबल्स](#wrench-environment-variables) |
| :rocket: | [अंदर क्या है](#rocket-whats-inside) |
| :robot: | [AI CLI प्रदाता](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Ollama का उपयोग](#llama-using-ollama) |
| :building_construction: | [आर्किटेक्चर](#building_construction-architecture) |
| :file_folder: | [प्रोजेक्ट संरचना](#file_folder-project-structure) |
| :floppy_disk: | [डेटा और स्थायित्व](#floppy_disk-data--persistence) |
| :lock: | [अनुमतियां](#lock-permissions) |
| :shield: | [Remote Access और Exposure](#shield-remote-access--exposure) |
| :bell: | [सूचनाएं](#bell-notifications) |
| :arrows_counterclockwise: | [अपग्रेड करना](#arrows_counterclockwise-upgrading) |
| :construction: | [समस्या निवारण](#construction-troubleshooting) |
| :warning: | [ज्ञात समस्याएं](#warning-known-issues) |
| :hammer_and_wrench: | [लोकल बिल्ड](#hammer_and_wrench-building-locally) |
| :bar_chart: | [विकल्प](#bar_chart-alternatives) |
| :rocket: | [रोडमैप](#rocket-roadmap) |
| :trophy: | [HolyClaude से बनाया](#trophy-built-with-holyclaude) |
| :handshake: | [योगदान](#handshake-contributing) |
| :heart: | [समर्थन](#heart-support) |
| :scroll: | [थर्ड-पार्टी सॉफ़्टवेयर](#scroll-third-party-software) |
| :page_facing_up: | [लाइसेंस](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :zap: त्वरित शुरुआत

**1.** HolyClaude के लिए एक फ़ोल्डर बनाएं:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** एक `docker-compose.yaml` फ़ाइल बनाएं। नीचे दिए गए टेम्पलेट में से एक कॉपी करें:
- [त्वरित टेम्पलेट](#whale-docker-compose--quick) — न्यूनतम, ज़ीरो कॉन्फ़िग, बस काम करता है
- [पूर्ण टेम्पलेट](#whale2-docker-compose--full) — सभी विकल्प, पूरी तरह से डॉक्युमेंटेड

**3.** पुल करें और शुरू करें:

```bash
docker compose up -d
```

**4.** वेब UI खोलें:

```
http://localhost:3001
```

**5.** एक CloudCLI अकाउंट बनाएं (10 सेकंड लगते हैं), अपने Anthropic अकाउंट से साइन इन करें, और आप live हैं।

> कोई `.env` फ़ाइलें नहीं। कोई प्री-कॉन्फ़िगरेशन नहीं। शुरू करने से पहले 40 पेज के डॉक्स पढ़ने की ज़रूरत नहीं। यह बस चलता है।

> **अपने network के बाहर से access करना चाहते हैं?** Port-forward मत करें। [Remote Access और Exposure](#shield-remote-access--exposure) देखें — Tailscale या Cloudflare Tunnel use करें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :computer: प्लेटफ़ॉर्म समर्थन

| प्लेटफ़ॉर्म | स्थिति | नोट्स |
|----------|--------|-------|
| Linux (amd64) | ✅ पूरी तरह समर्थित | नेटिव परफॉर्मेंस, अनुशंसित |
| Linux (arm64) | ✅ पूरी तरह समर्थित | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ पूरी तरह समर्थित | Apple Silicon और Intel via Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ पूरी तरह समर्थित | WSL2 backend आवश्यक |
| Synology / QNAP NAS | ✅ पूरी तरह समर्थित | SMB माउंट के लिए `CHOKIDAR_USEPOLLING=true` उपयोग करें |
| Kubernetes | 🔜 जल्द आ रहा है | Helm chart योजनाबद्ध |

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :star2: HolyClaude क्यों

मैंने यह इसलिए बनाया क्योंकि मैं हर बार एक ही सेटअप दोबारा करते-करते थक गया था। Claude Code इंस्टॉल करना, एक वेब UI वायर करना, Docker में Chromium कॉन्फ़िगर करना, permission issues ठीक करना, process supervision डीबग करना। हर बार।

तो मैंने एक कंटेनर बनाया जो यह सब करता है। और फिर मैंने हर संभव बग को हिट किया ताकि आपको न करना पड़े।

| | HolyClaude | खुद करना |
|---|---|---|
| **सेटअप** | 30 सेकंड | 1-2 घंटे (अगर अच्छा जाए) |
| **Claude Code** | प्री-इंस्टॉल्ड, प्री-कॉन्फ़िगर्ड, तैयार | इंस्टॉल करें, कॉन्फ़िगर करें, इंस्टॉलर हैंग डीबग करें, WORKDIR ठीक करें |
| **Web UI** | CloudCLI plugins के साथ शामिल | एक वेब UI ढूंढें, इंस्टॉल करें, कॉन्फ़िगर करें, Claude से जोड़ें |
| **हेडलेस ब्राउज़र** | Chromium + Xvfb + Playwright, कॉन्फ़िगर्ड | Chromium इंस्टॉल करें, Xvfb इंस्टॉल करें, display :99 कॉन्फ़िगर करें, shm ठीक करें, sandbox ठीक करें, seccomp ठीक करें... |
| **AI CLIs** | 8 providers, एक कंटेनर | हर एक को 3 package managers में अलग-अलग इंस्टॉल करें |
| **Dev tools** | 50+ टूल्स, तैयार | अगले एक घंटे के लिए `apt-get install` / `npm i -g` / `pip install` |
| **Process management** | s6-overlay (auto-restart, graceful shutdown) | अपना supervisord config लिखें या Docker restart काम करने की उम्मीद रखें |
| **Persistence** | Bind mounts, credentials सब कुछ survive करते हैं | Docker volumes समझें, "यह directory क्यों है file नहीं" डीबग करें |
| **अपडेट** | `docker pull && docker compose up -d` | 50 टूल्स मैन्युअली अपडेट करें, प्रार्थना करें कुछ टूटे नहीं |
| **Multi-arch** | AMD64 + ARM64 | प्रार्थना करें कि आपका Dockerfile ARM पर बिल्ड हो |

**हर मैन्युअल सेटअप की आखिरी पंक्ति होती है "मेरी मशीन पर काम करता है।"** HolyClaude हर मशीन पर काम करता है।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :credit_card: सब्सक्रिप्शन और प्रमाणीकरण

HolyClaude Anthropic का **आधिकारिक Claude Code CLI** चलाता है। आपका मौजूदा अकाउंट out of the box काम करता है।

### क्या काम करता है:

| प्रमाणीकरण विधि | कैसे | लागत |
|----------------------|-----|------|
| **Claude Max/Pro प्लान** (सब्सक्रिप्शन) | CloudCLI वेब UI के ज़रिए साइन इन करें — डेस्कटॉप जैसा ही OAuth flow | आपकी मौजूदा सब्सक्रिप्शन, कोई अतिरिक्त शुल्क नहीं |
| **Anthropic API key** | वेब UI में अपनी API key पेस्ट करें | Pay-per-use, वही Anthropic बिलिंग |

### क्या काम नहीं करता:

| | क्यों |
|---|---|
| Claude के लिए OpenAI API key | अलग कंपनी, अलग API। OpenAI keys **Codex CLI** के साथ काम करती हैं (जो भी प्री-इंस्टॉल्ड है) |

> **ChatGPT Plus/Pro सब्सक्राइबर्स:** आपकी सब्सक्रिप्शन **Codex CLI** के साथ काम करती है। अपने ChatGPT अकाउंट से authenticate करने के लिए कंटेनर के अंदर `codex login --device-auth` चलाएं।

### अन्य AI CLIs शामिल हैं:

| CLI | आपको क्या चाहिए |
|-----|--------------|
| Gemini CLI | Google AI API key (`GEMINI_API_KEY`) |
| OpenAI Codex | OpenAI API key (`OPENAI_API_KEY`) या ChatGPT Plus/Pro सब्सक्रिप्शन (`codex login --device-auth`) |
| Cursor | Cursor API key (`CURSOR_API_KEY`) |
| TaskMaster AI | आपकी AI provider keys का उपयोग करता है (Anthropic, OpenAI, आदि) |
| Junie | JetBrains अकाउंट (JetBrains AI सब्सक्रिप्शन) |
| OpenCode | `opencode` TUI के ज़रिए कॉन्फ़िगर करें (OpenRouter और कई providers समर्थित) |
| Pi Coding Agent | `pi` के ज़रिए configure करें (कई providers समर्थित) |

> **HolyClaude मुफ़्त और ओपन सोर्स है।** आप अपने AI providers को उपयोग के लिए पे करते हैं, जैसा आप पहले से करते हैं। हम आपके credentials को proxy, intercept, या touch नहीं करते। वे आपके local bind mount में रहते हैं।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :package: इमेज वेरिएंट

दो विकल्प। समान गुणवत्ता। अपना वज़न वर्ग चुनें।

| Tag | आपको क्या मिलता है | किसके लिए सबसे अच्छा |
|-----|-------------|----------|
| **`latest`** | सब कुछ प्री-इंस्टॉल्ड — हर टूल, हर लाइब्रेरी, हर CLI | अधिकांश उपयोगकर्ता। ज़ीरो wait time। Claude को कभी रुककर कुछ इंस्टॉल नहीं करना पड़ता। |
| **`slim`** | केवल core tools — Claude अतिरिक्त चीजें on-demand इंस्टॉल करता है | छोटा VPS, सीमित disk, मीटर्ड bandwidth |
| `X.Y.Z` | पूर्ण इमेज, pinned version | Production stability — आप तय करते हैं कब अपडेट करना है |
| `X.Y.Z-slim` | Slim इमेज, pinned version | Production + छोटा footprint |

```bash
# Full — batteries included (अनुशंसित)
docker pull coderluii/holyclaude

# Slim — lean and mean
docker pull coderluii/holyclaude:slim
```

> **`latest` हमेशा पूर्ण इमेज है।** Slim उपयोगकर्ता: चिंता न करें — जब आप Claude से कुछ ऐसा करवाते हैं जिसके लिए कोई missing टूल चाहिए, तो वह सेकंडों में इंस्टॉल हो जाता है। आपको वही क्षमताएं मिलती हैं, बस छोटा initial download।
>
> Docker Hub compressed download size दिखाता है: `latest` लगभग 4.1 GB और `slim` लगभग 2.4 GB है। Docker, Synology Container Manager, और NAS filesystem layers extract होने के बाद बड़ा unpacked size दिखा सकते हैं।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :whale: Docker Compose — त्वरित

"मैं बस इसे चलाना चाहता हूं" टेम्पलेट। इस पूरे block को एक `docker-compose.yaml` फ़ाइल में कॉपी करें:

```yaml
# ==============================================================================
# HolyClaude — Quick Start
# Just run: docker compose up -d
# Then open: http://localhost:3001
# ==============================================================================

services:
  holyclaude:
    image: coderluii/holyclaude:latest     # Full image (use :slim for smaller download)
    container_name: holyclaude
    hostname: holyclaude
    restart: unless-stopped
    shm_size: 2g                           # Retained browser default for this release
    network_mode: bridge
    cap_add:
      - SYS_ADMIN                          # Current browser profile for this release; hardening is separate
      - SYS_PTRACE                         # Debugging-related capability
    security_opt:
      - seccomp=unconfined                 # Current browser profile for this release; hardening is separate
    ports:
      - "127.0.0.1:3001:3001"              # CloudCLI web UI, localhost only
    volumes:
      #
      # ./data/claude — Your settings, credentials, API keys, and Claude's memory.
      #                  This is what survives container rebuilds.
      #                  NEVER delete this folder — your auth lives here.
      #
      - ./data/claude:/home/claude/.claude
      #
      # ./workspace — Your code. All projects go here.
      #               Bind-mounted so you can access files from your host.
      #
      - ./workspace:/workspace
    environment:
      - TZ=UTC                             # Your timezone (e.g., America/New_York, Europe/London)
```

फिर:

```bash
docker compose up -d
```

`http://localhost:3001` खोलें। CloudCLI अकाउंट बनाएं। अपने Anthropic अकाउंट से साइन इन करें। कुछ बनाएं।

**बस यही पूरा सेटअप है। आप कर चुके हैं।**

> **ये browser capabilities क्यों?** यह रिलीज HolyClaude का current browser profile बनाए रखती है। `SYS_ADMIN` और `seccomp=unconfined` process privileges बढ़ाते हैं और isolation कम करते हैं; `SYS_PTRACE` debugging के लिए है। v1.5.0 के लिए इस profile को जस का तस रखें और hardening को अलग बदलाव मानें।

> **`shm_size: 2g` क्यों?** Docker डिफ़ॉल्ट रूप से containers को 64MB shared memory देता है। HolyClaude इस रिलीज़ के लिए 2GB को retained default रखता है क्योंकि Chromium tab rendering के लिए `/dev/shm` का भारी उपयोग करता है। 64MB पर tabs crash होते हैं; heavy browser use के लिए 4GB करें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :whale2: Docker Compose — पूर्ण

वही इमेज, हर विकल्प exposed। इस पूरे block को एक `docker-compose.yaml` फ़ाइल में कॉपी करें:

```yaml
# ==============================================================================
# HolyClaude — Full Configuration
# All options documented inline.
# Detailed docs: https://github.com/CoderLuii/HolyClaude/blob/master/docs/configuration.md
# ==============================================================================

services:
  holyclaude:
    image: coderluii/holyclaude:latest     # Full image (use :slim for smaller download)
    container_name: holyclaude
    hostname: holyclaude
    restart: unless-stopped
    shm_size: 2g                           # Chromium shared memory — increase to 4g for heavy browser use
    network_mode: bridge
    cap_add:
      - SYS_ADMIN                          # Current browser profile for this release; hardening is separate
      - SYS_PTRACE                         # Debugging-related capability (strace, lsof)
    security_opt:
      - seccomp=unconfined                 # Current browser profile for this release; hardening is separate
    ports:
      #
      # CloudCLI web UI — this is the only port you need.
      # Override the host-side port from `.env` if 3001 is already in use.
      #
      - "127.0.0.1:${HOLYCLAUDE_HOST_PORT:-3001}:3001"
      #
      # Dev server ports — uncomment as needed.
      # These let you access dev servers running inside the container from your host browser.
      #
      # - "127.0.0.1:3000:3000"            # Next.js / Express
      # - "127.0.0.1:4321:4321"            # Astro
      # - "127.0.0.1:5173:5173"            # Vite
      # - "127.0.0.1:8787:8787"            # Wrangler (Cloudflare Workers)
      # - "127.0.0.1:9229:9229"            # Node.js debugger
    volumes:
      #
      # PERSISTENT DATA
      #
      # ./data/claude — Settings, credentials, API keys, Claude's memory file.
      #                  Survives container rebuilds. NEVER delete this folder.
      #                  Override the host path from `.env` if you want it elsewhere.
      #
      - ${HOLYCLAUDE_HOST_CLAUDE_DIR:-./data/claude}:/home/claude/.claude
      #
      # ./workspace — Your code and projects. Everything you build goes here.
      #               Accessible from your host machine.
      #               Override the host path from `.env` if you want a different root.
      #
      - ${HOLYCLAUDE_HOST_WORKSPACE_DIR:-./workspace}:/workspace
    environment:
      #
      # TIMEZONE
      # Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      #
      - TZ=UTC
      #
      # PERFORMANCE
      # Node.js heap memory limit in MB. Increase if you work on large monorepos
      # and hit out-of-memory errors. 4096 (4GB) is a solid default.
      #
      - NODE_OPTIONS=--max-old-space-size=4096
      #
      # USER MAPPING
      # Match these to your host user so files created inside the container
      # have the right ownership on your host. Run `id -u` and `id -g` on your host.
      #
      - PUID=1000
      - PGID=1000
      #
      # SMB/CIFS NETWORK MOUNTS
      # Only enable these if your volumes are on a NAS, Samba share, or CIFS mount.
      # They enable polling-based file watching since network mounts don't support inotify.
      # Leave commented out for local storage — polling uses more CPU.
      #
      # - CHOKIDAR_USEPOLLING=1
      # - WATCHFILES_FORCE_POLLING=true
      #
      # NOTIFICATIONS (optional)
      # Get notified when Claude finishes a task or hits an error.
      # Uses Apprise — supports 100+ services. Also requires creating a flag file
      # inside the container: touch ~/.claude/notify-on
      #
      # - NOTIFY_DISCORD=discord://webhook_id/webhook_token
      # - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
      # - NOTIFY_PUSHOVER=pover://user_key@app_token
      # - NOTIFY_SLACK=slack://token_a/token_b/token_c
      # - NOTIFY_EMAIL=mailto://user:pass@gmail.com?to=you@gmail.com
      # - NOTIFY_GOTIFY=gotify://hostname/token
      # - NOTIFY_URLS=                                   # catch-all: comma-separated Apprise URLs
      #
      # AI PROVIDER KEYS (optional)
      # Claude Code can authenticate via web UI (OAuth) or ANTHROPIC_API_KEY.
      # Set these if you want to use additional AI CLIs or API-based auth.
      #
      # - GEMINI_API_KEY=your_key
      # - OPENAI_API_KEY=your_key
      # - CURSOR_API_KEY=your_key
```

फिर:

```bash
docker compose up -d
```

अगर आप compose edit किए बिना host-side port या bind-mount paths बदलना चाहते हैं, तो `.env.example` को `.env` में कॉपी करें और सेट करें:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

ये values Docker Compose द्वारा host पर पढ़ी जाती हैं। ये container environment variables नहीं हैं।

### हर section क्या नियंत्रित करता है:

| Section | यह क्या करता है | कब बदलें |
|---------|-------------|-------------------|
| **Timezone** | Container clock | हमेशा — अपने local TZ पर सेट करें |
| **Performance** | Node.js memory ceiling | सिर्फ तब जब बड़े projects पर OOM errors हों |
| **User mapping** | Container और host के बीच file permissions | अगर आपको "permission denied" मिले (`id -u` और `id -g` अपने host पर चलाएं) |
| **SMB/CIFS** | File watcher polling mode | सिर्फ तब जब आपके volumes NAS या network share पर हों |
| **Notifications** | Apprise के ज़रिए push alerts (Discord, Telegram, Slack, Email, 100+ services) | अगर आप जाना चाहते हैं और जानना चाहते हैं कि Claude कब done हो |
| **AI providers** | Gemini, Codex, Cursor, Junie, OpenCode, Pi Coding Agent के लिए API keys | अगर आप Claude के अलावा अन्य AI CLIs उपयोग करना चाहते हैं |

> **हर एक environment variable optional है।** Container सिर्फ `TZ=UTC` के साथ perfectly चलता है। बाकी सब में sensible defaults हैं या वेब UI के ज़रिए handle होते हैं।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :wrench: पर्यावरण वेरिएबल्स

पूरा संदर्भ। हर variable, इसका default क्या है, यह क्या करता है।

| Variable | Default | यह क्या करता है |
|----------|---------|--------------|
| `TZ` | `UTC` | Container timezone |
| `PUID` | `1000` | Docker-style container user ID; rootless Podman के लिए `docker-compose.podman-rootless.yaml` इस्तेमाल करें |
| `PGID` | `1000` | Docker-style container group ID; rootless Podman के लिए `docker-compose.podman-rootless.yaml` इस्तेमाल करें |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js heap memory limit in MB |
| `GIT_USER_NAME` | `HolyClaude User` | Git commit author (पहले boot पर एक बार सेट) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git commit email (पहले boot पर एक बार सेट) |
| `CHOKIDAR_USEPOLLING` | *(unset)* | SMB/CIFS के लिए `1` सेट करें — polling file watchers enable करता है |
| `WATCHFILES_FORCE_POLLING` | *(unset)* | SMB/CIFS के लिए `true` सेट करें — Python polling enable करता है |
| `NOTIFY_DISCORD` | *(unset)* | सूचनाओं के लिए Discord webhook URL |
| `NOTIFY_TELEGRAM` | *(unset)* | सूचनाओं के लिए Telegram bot URL |
| `NOTIFY_PUSHOVER` | *(unset)* | सूचनाओं के लिए Pushover URL |
| `NOTIFY_SLACK` | *(unset)* | सूचनाओं के लिए Slack webhook URL |
| `NOTIFY_EMAIL` | *(unset)* | सूचनाओं के लिए Email (SMTP) URL |
| `NOTIFY_GOTIFY` | *(unset)* | सूचनाओं के लिए Gotify URL |
| `NOTIFY_URLS` | *(unset)* | Catch-all — comma-separated [Apprise URLs](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(unset)* | Anthropic API key (वेब UI OAuth के विकल्प के रूप में) |
| `ANTHROPIC_AUTH_TOKEN` | *(unset)* | Anthropic auth token (API key के विकल्प के रूप में) |
| `ANTHROPIC_BASE_URL` | *(unset)* | Custom Anthropic API endpoint (proxies, private deployments) |
| `CLAUDE_CODE_USE_BEDROCK` | *(unset)* | Amazon Bedrock backend उपयोग करने के लिए `1` सेट करें |
| `CLAUDE_CODE_USE_VERTEX` | *(unset)* | Google Vertex AI backend उपयोग करने के लिए `1` सेट करें |
| `GEMINI_API_KEY` | *(unset)* | Google Gemini API key |
| `OPENAI_API_KEY` | *(unset)* | OpenAI API key (Codex CLI के लिए, या ChatGPT सब्सक्रिप्शन के लिए `codex login --device-auth` उपयोग करें) |
| `CURSOR_API_KEY` | *(unset)* | Cursor API key |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | वैकल्पिक Desloppify global skill setup. मान्य: `off`, `all`, `claude`, `codex`, `gemini`, `opencode` या comma-separated subsets |
| `OLLAMA_HOST` | *(unset)* | Ollama endpoint URL (जैसे, `http://host.docker.internal:11434`) |

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :rocket: अंदर क्या है

यह एक minimal container नहीं है। यह एक पूरा development workstation है।

### दोनों variants (full + slim)

<details>
<summary><strong>Node.js 26 + npm global packages</strong></summary>

| Package | किसके लिए है |
|---------|---------------|
| `typescript`, `tsx` | TypeScript compilation और execution |
| `pnpm` | Fast, disk-efficient package manager |
| `vite`, `esbuild` | Lightning-fast build tools |
| `eslint`, `prettier` | Code quality और formatting |
| `serve`, `nodemon` | Static file server, auto-restart dev server |
| `concurrently` | Multiple scripts को parallel में चलाएं |
| `dotenv-cli` | `.env` files से env vars load करें |

</details>

<details>
<summary><strong>Python 3 packages</strong></summary>

| Package | किसके लिए है |
|---------|---------------|
| `requests`, `httpx` | HTTP clients |
| `beautifulsoup4`, `lxml` | Web scraping और HTML parsing |
| `Pillow` | Image processing (pre-compiled — कोई wait नहीं) |
| `pandas`, `numpy` | Data manipulation (pre-compiled — सच में, आप इन्हें runtime पर pip install नहीं करना चाहते) |
| `openpyxl` | Excel files read/write |
| `python-docx` | Word documents read/write |
| `jinja2`, `markdown` | Templating और markdown rendering |
| `pyyaml`, `python-dotenv` | Config file parsing |
| `rich`, `click`, `tqdm` | खूबसूरत CLIs और progress bars |
| `desloppify`, `bandit`, `tree-sitter` | Code-quality scans, Python security checks, parser-backed code analysis |
| `playwright` | Browser automation (Chromium पहले से configured और तैयार) |

</details>

<details>
<summary><strong>System tools</strong></summary>

| टूल | किसके लिए है |
|------|---------------|
| `git`, `gh` | Version control + GitHub CLI (terminal से PRs, issues, releases) |
| `ripgrep` (`rg`), `fd`, `fzf` | Blazing-fast search — Claude इनका लगातार उपयोग करता है |
| `bat`, `tree`, `jq` | Better cat (syntax highlighting), directory trees, JSON processing |
| `curl`, `wget` | HTTP downloads |
| `tmux` | Terminal multiplexer — background में चीजें चलाएं |
| `htop`, `lsof`, `strace` | Process monitoring और debugging |
| `imagemagick` | Image conversion (`convert`, `identify`, `mogrify`) |
| `chromium` | Headless browser — screenshots, Playwright, Lighthouse |
| `psql`, `redis-cli`, `sqlite3` | सीधे databases से बात करें |
| `openssh-client`, `openssh-server`, `mosh` | बाहर SSH, और कंटेनर में वैकल्पिक SSH/Mosh एक्सेस |

</details>

<details>
<summary><strong>AI CLIs — हर major provider</strong></summary>

| CLI | Command | किसके लिए है |
|-----|---------|---------------|
| **Claude Code** | `claude` | मुख्य event — आप इसके अंदर चल रहे हैं |
| **Gemini CLI** | `gemini` | Google का AI coding agent |
| **OpenAI Codex** | `codex` | OpenAI का coding agent |
| **Cursor** | `cursor` | Cursor का AI agent |
| **TaskMaster AI** | `task-master` | Task planning और orchestration |
| **Junie** | `junie` | JetBrains का AI coding agent |
| **OpenCode** | `opencode` | Open source AI agent (OpenRouter और multiple providers) |
| **Pi Coding Agent** | `pi` | Minimal agent harness (multiple providers) |

आठ AI CLIs। एक container। एक `Tab` दबाकर उनके बीच switch करें। कोई अन्य Docker image यह नहीं करती।

</details>

### केवल Full image (अतिरिक्त packages)

Full image में ऊपर सब कुछ, plus:

<details>
<summary><strong>अतिरिक्त npm packages — deployment, ORMs, performance</strong></summary>

| Package | किसके लिए है |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Cloudflare Workers deployment |
| `vercel` | Vercel deployment |
| `netlify-cli` | Netlify deployment |
| `az` | Cloud deployment और management के लिए Azure CLI |
| `prisma`, `drizzle-kit` | दो सबसे popular Node.js ORMs |
| `pm2` | Production process manager |
| `eas-cli` | Expo / React Native builds |
| `lighthouse`, `@lhci/cli` | Performance auditing (Chromium पहले से मौजूद है) |
| `sharp-cli` | Image processing CLI |
| `json-server`, `http-server` | Mock REST APIs, static file serving |
| `@marp-team/marp-cli` | Markdown से presentation slides |

</details>

<details>
<summary><strong>अतिरिक्त Python packages — PDFs, data viz, web frameworks</strong></summary>

| Package | किसके लिए है |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | हर major PDF library। उन्हें generate करें, पढ़ें, convert करें, merge करें। |
| `xlsxwriter`, `xlrd` | Excel formats जो openpyxl cover नहीं करता |
| `matplotlib`, `seaborn` | Data visualization और charts |
| `python-pptx` | PowerPoint generation |
| `fastapi`, `uvicorn` | Python web framework |

</details>

<details>
<summary><strong>अतिरिक्त system packages — media, documents</strong></summary>

| Package | किसके लिए है |
|---------|---------------|
| `pandoc` | किसी भी document format के बीच convert करें (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Video और audio processing (extract, convert, transcode) |
| `libvips-dev` | High-performance image processing library |

</details>

> **Slim उपयोगकर्ता:** कोई package missing है? Claude से पूछें। यह npm/pip packages सेकंडों में इंस्टॉल करता है। System packages (pandoc, ffmpeg) में 1-2 मिनट लगते हैं। आपको वही क्षमताएं मिलती हैं — full image में बस ज़ीरो wait time है।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :robot: AI CLI प्रदाता

आठ AI CLIs। एक container। कोई अन्य Docker image आपको यह नहीं देती।

| Provider | Command | कैसे authenticate करें | सब्सक्रिप्शन काम करती है? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | CloudCLI वेब UI (OAuth) | **हां** — Max/Pro प्लान या API key |
| **Gemini CLI** | `gemini` | `GEMINI_API_KEY` env var | API key (pay-per-use) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` या `codex login --device-auth` | **हां** — ChatGPT Plus/Pro/Team/Enterprise या API key |
| **Cursor** | `cursor` | `CURSOR_API_KEY` env var | API key |
| **TaskMaster AI** | `task-master` | मौजूदा AI provider keys उपयोग करता है | configured keys के साथ काम करता है |
| **Junie** | `junie` | JetBrains AI सब्सक्रिप्शन | JetBrains अकाउंट आवश्यक |
| **OpenCode** | `opencode` | TUI के ज़रिए configure करें | OpenRouter और कई providers समर्थित; सिर्फ full image |
| **Pi Coding Agent** | `pi` | Pi के ज़रिए configure करें | कई providers समर्थित |

> Claude Code primary CLI है। बाकी इसलिए हैं क्योंकि कभी-कभी आप दूसरी राय चाहते हैं, या किसी specific model की खूबियां चाहते हैं, या outputs की तुलना कर रहे हैं। एक `Tab` दूर सभी का होना ही पूरा point है।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :mag: Desloppify

Desloppify दोनों images में `desloppify` command के रूप में आता है। Default में यह passive रहता है: HolyClaude scans नहीं चलाता, `.desloppify/` नहीं बनाता, `.gitignore` edit नहीं करता, और mounted workspace नहीं बदलता जब तक आप खुद Desloppify नहीं चलाते।

```bash
desloppify scan --path .
desloppify next
```

किसी project को scan करने के बाद उस project की `.gitignore` में `.desloppify/` जोड़ें।

`HOLYCLAUDE_DESLOPPIFY_SETUP=off` सिर्फ automatic global skill setup बंद करता है; CLI installed रहती है। `all` का मतलब `claude,codex,gemini` है। `opencode` सिर्फ full image में है और `all` में शामिल नहीं है। `claude` और `opencode` को automatic setup में साथ न रखें, क्योंकि OpenCode `~/.claude/skills` से Claude-compatible skills भी खोज सकता है।

Manual upstream targets: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, `hermes`.

<p align="right">
  <a href="#top">↑ ऊपर वापस</a>
</p>

---

## :llama: Ollama का उपयोग

HolyClaude Anthropic सब्सक्रिप्शन के विकल्प के रूप में [Ollama](https://ollama.com) के साथ काम करता है। दो environment variables सेट करें और local या cloud models उपयोग करें।

पूरा setup guide देखें: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :building_construction: आर्किटेक्चर

```mermaid
graph TB
    subgraph Docker Container
        EP["entrypoint.sh"] --> BS["bootstrap.sh\n(first boot only)"]
        EP --> S6["s6-overlay\n(PID 1)"]
        S6 --> CC["CloudCLI\n(:3001)"]
        S6 --> XV["Xvfb\n(:99)"]
        CC --> CLAUDE["Claude Code CLI"]
        CLAUDE --> TOOLS["Dev Tools\n(Node, Python, Git...)"]
        CLAUDE --> CHROME["Chromium\n(headless)"]
        XV -.-> CHROME
    end

    subgraph Host
        DATA["./data/claude"] -.->|bind mount| HOME["~/.claude"]
        WS["./workspace"] -.->|bind mount| WORK["/workspace"]
    end

    USER["Browser"] -->|":3001"| CC

    style S6 fill:#2d3748,color:#fff
    style CC fill:#6366f1,color:#fff
    style CLAUDE fill:#f59e0b,color:#000
```

### टुकड़े कैसे fit होते हैं

1. **Container शुरू होता है** — `entrypoint.sh` root के रूप में चलता है। UID/GID को आपके host user से मिलाने के लिए remap करता है, bootstrap से पहले saved Claude Code session restore करता है, और check करता है कि यह first boot है या नहीं।

2. **केवल पहले boot पर** — `bootstrap.sh` एक बार चलता है। Default settings, memory template copy करता है, git identity configure करता है। एक sentinel file (`.holyclaude-bootstrapped`) बनाता है ताकि यह दोबारा कभी न चले। उस बिंदु से आपके customizations सुरक्षित हैं।

3. **s6-overlay PID 1 के रूप में कार्यभार संभालता है** — यह supervisord नहीं है। यह [s6-overlay](https://github.com/just-containers/s6-overlay) है, जो Docker के लिए purpose-built है। CloudCLI, Xvfb, और Claude session sync को supervise करता है। Crash पर auto-restart करता है। Signals forward करता है। Zombies reap करता है। Gracefully shutdown करता है।

4. **CloudCLI वेब UI serve करता है** — Port 3001। Claude Code का browser-based interface जिसमें project management, multiple sessions, और plugins (project stats + web terminal शामिल) हैं।

5. **Xvfb compatibility display देता है** — Visible display इस्तेमाल करने वाले tools के लिए Xvfb `:99` पर उपलब्ध रहता है। Modern headless Chromium, Playwright और Lighthouse को हर स्थिति में Xvfb की जरूरत नहीं होती।

पूरे technical deep-dive के लिए [docs/architecture.md](docs/architecture.md) देखें — जिसमें यह भी शामिल है कि हमने supervisord पर s6 क्यों चुना, plugins image में क्यों baked हैं, और `su` के बजाय `runuser` क्यों।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :file_folder: प्रोजेक्ट संरचना

```
holyclaude/
├── .github/                 # CI/CD workflows, issue & PR templates
│   ├── FUNDING.yml          # Sponsor/donation links
│   ├── ISSUE_TEMPLATE/      # Bug report, feature request, package request
│   ├── pull_request_template.md
│   ├── SECURITY.md          # Security policy
│   └── workflows/           # Docker build & push automation
├── assets/                  # Logo and banner images
├── config/                  # Claude Code configuration
│   ├── claude-memory-full.md
│   ├── claude-memory-slim.md
│   └── settings.json
├── docs/                    # Extended documentation
│   ├── architecture.md
│   ├── CHANGELOG.md
│   ├── configuration.md
│   ├── dockerhub-description.md
│   ├── ollama.md
│   └── troubleshooting.md
├── scripts/                 # Container lifecycle scripts
│   ├── bootstrap.sh         # First-run setup
│   ├── entrypoint.sh        # Container entrypoint
│   └── notify.py            # Notification helper (Apprise)
├── s6-overlay/              # Process supervision (s6-rc services)
├── Dockerfile               # Single-stage build
├── docker-compose.yaml      # Quick start (minimal config)
├── docker-compose.full.yaml # Full config (all options)
├── LICENSE
└── README.md
```

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :floppy_disk: डेटा और स्थायित्व

| क्या | कहां (container) | कहां (host) | rebuild survive करता है? |
|------|-------------------|-------------|-------------------|
| Settings, credentials, API keys | `/home/claude/.claude` | `./data/claude` | **हां** |
| Claude Code session (OAuth, onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **हां** |
| आपका code और projects | `/workspace` | `./workspace` | **हां** |
| CloudCLI अकाउंट | `/home/claude/.cloudcli` | *(default में केवल container में — नीचे देखें)* | नहीं (opt-in उपलब्ध) |

HolyClaude startup में नया default file बनाने से पहले saved Claude Code session restore करता है। इससे rebuild और recreate real OAuth/API session को onboarding state से replace नहीं करते।

### `docker compose down && docker compose up` से क्या बचता है:
- आपकी Anthropic authentication और API keys
- Claude Code settings, memory (`CLAUDE.md`) और OAuth session (दोबारा login नहीं)
- `./workspace` में आपका सारा code
- Git configuration
- Codex, Gemini और Cursor CLI auth (v1.1.7 से)

### आप क्या दोबारा करेंगे (10 सेकंड):
- CloudCLI वेब अकाउंट — quick signup, बस इतना ही (जब तक नीचे persistence enable न करें)

### पहले-boot setup को दोबारा trigger करना:
```bash
# sentinel file delete करें — पूरा folder नहीं
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **`./data/claude/` को पूरी तरह कभी न delete करें।** वहां आपके credentials रहते हैं। अगर आप fresh bootstrap चाहते हैं तो sentinel file delete करें। Settings reset करने के लिए specific config files delete करें। लेकिन पूरा folder कभी न मिटाएं।

### CloudCLI account को persist करना (optional, केवल local storage)

Default में, CloudCLI account database (`~/.cloudcli`) container-local है और rebuild पर wipe हो जाती है। Account दोबारा बनाने में 10 सेकंड लगते हैं, इसलिए ज़्यादातर लोग इसे ऐसे ही छोड़ देते हैं।

अगर आप चाहते हैं कि यह rebuilds के बाद भी बचे, तो अपने compose file में एक **named Docker volume** जोड़ें:

```yaml
services:
  holyclaude:
    volumes:
      - ./data/claude:/home/claude/.claude
      - ./workspace:/workspace
      - cloudcli-data:/home/claude/.cloudcli   # add this line

volumes:
  cloudcli-data:                                # and this block
```

> **`./data/cloudcli` को network share (NAS, SMB/CIFS, NFS) पर bind-mount न करें।** CloudCLI अपना account SQLite में store करता है, और SQLite का file locking network mounts पर काम नहीं करता। आपको लगातार `database is locked` errors आएंगी। Named volumes Docker engine के local filesystem पर रहते हैं, इसीलिए यह काम करता है — NAS पर pointing bind mounts काम नहीं करेंगे।

Local SSD path पर bind mount भी ठीक है, बस किसी भी network share से दूर रखें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :lock: अनुमतियां

Claude Code डिफ़ॉल्ट रूप से **`acceptEdits`** mode में चलता है। यही image में shipped setting है:

| कार्य | अनुमति है? |
|--------|----------|
| Files पढ़ना | हां |
| Files edit / create करना | हां |
| Shell commands चलाना | **पहले आपसे पूछता है** |
| Packages install करना | **पहले आपसे पूछता है** |

### पूरी bypass चाहते हैं? (power users)

यह वैसे ही है जैसे मैं personally चलाता हूं। अपने host पर `./data/claude/settings.json` edit करें:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Bypass mode का मतलब है Claude बिना confirmation के commands execute करता है।** यह powerful है, लेकिन destructive commands भी जल्दी चला सकता है। Workspace और हर prompt पर भरोसा न हो तो shipped `acceptEdits` default रखें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :shield: Remote Access और Exposure

HolyClaude CloudCLI को port `3001` से bind करता है। Default में यह केवल local है — अपने laptop या home server पर चलाने के लिए ठीक है जिसे आप SSH से access करते हैं।

**जिस moment आप इसे अपने network के बाहर से access करना चाहते हैं, यह section पढ़ें।**

### इसे public internet पर port-forward न करें

सीधे कहता हूं: अपने router में hole मत करो और `3001` को open internet पर expose मत करो। Password के साथ भी नहीं। क्यों:

- CloudCLI web terminal plugin के ज़रिए full shell expose करता है
- यह arbitrary code run कर सकता है, packages install कर सकता है, और आपका पूरा `/workspace` read/write कर सकता है
- इसमें आपके Anthropic OAuth tokens और API keys हैं
- Basic auth passwords brute-force, credential-stuff होते हैं और logs से निकाले जाते हैं
- एक leaked password = कोई और आपके पैसे से आपकी machine पर paid Claude Code instance चला रहा है

Password एक speed bump है, दरवाज़ा नहीं। HolyClaude को SSH session की तरह treat करें: बिना proper tunnel के open internet पर कभी नहीं।

### इसके बजाय proper tunnel use करें

ये दो options हैं जो मैं actually recommend करता हूं:

| Option | किसके लिए | क्यों |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Personal use, small teams | WireGuard mesh VPN। अपने server + laptop/phone पर Tailscale install करें, और आप `http://holyclaude:3001` को कहीं से भी access कर सकते हैं जैसे LAN पर हों। कोई open ports नहीं, कोई DNS नहीं, कोई certs नहीं। Personal use के लिए free। |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | दूसरों के साथ share करना, public hostname | Cloudflare connection proxy करता है, इसलिए port `3001` बंद रहता है। आपको HTTPS के साथ real domain मिलता है, और आप Cloudflare Access (Google/GitHub SSO) सामने रख सकते हैं। Free tier ज़्यादातर personal use cover करता है। |

दोनों आपको देते हैं:
- Router पर zero open ports
- End to end encrypted transport
- Real identity-based auth (shared password नहीं)
- Audit logs

### अगर आप इसे directly expose करने पर जोर देते हैं (please मत करें)

अगर आपको absolutely tunnel skip करना है (self-hosting tutorial, isolated lab network, जो भी हो), कम से कम:

1. **इसके सामने reverse proxy रखें** (Caddy, nginx, Traefik) real TLS के साथ
2. **Firewall या proxy level पर IP allowlisting जोड़ें** — केवल आपके known IPs
3. **Shipped `acceptEdits` default रखें**, जब तक `bypassPermissions` का clear reason न हो
4. **अपने Anthropic credentials rotate करें** अगर कुछ गड़बड़ लगे
5. **Cloudflare Access या similar SSO के पीछे run करें**, basic auth नहीं

इन सबके बावजूद, risk surface बहुत बड़ा है। Tailscale या Cloudflare Tunnel use करें। ये free हैं, setup में पांच मिनट लगते हैं, और यही मैं personally use करता हूं।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :bell: सूचनाएं

अपने computer से दूर जाएं और जानें कि Claude कब done हो गया। Notifications के लिए [Apprise](https://github.com/caronc/apprise) का उपयोग करता है — Discord, Telegram, Slack, Email, Pushover, Gotify, और अधिक सहित 100+ services support करता है।

**Enable करने के लिए:**

1. अपने compose `environment` में एक या अधिक `NOTIFY_*` variables जोड़ें:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. Container के अंदर: `touch ~/.claude/notify-on`

सभी supported variables और URL formats के लिए [configuration docs](docs/configuration.md#notifications-apprise) देखें।

**Disable करने के लिए:** `rm ~/.claude/notify-on`

**वे events जो notifications trigger करते हैं:**
| Event | क्या हुआ |
|-------|--------------|
| `stop` | Claude ने current task finish कर दी |
| `error` | एक tool use failure हुई |

> Configure न होने पर पूरी तरह silent। कोई `NOTIFY_*` vars नहीं? कोई flag file नहीं? Zero network calls। Zero log spam। Zero overhead।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :arrows_counterclockwise: अपग्रेड करना

```bash
# Latest image pull करें
docker compose pull

# नई image के साथ container recreate करें
docker compose up -d
```

आपका data `./data/claude` और `./workspace` में persist रहता है — upgrading केवल container replace करती है, आपकी files नहीं।

Container के अंदर `cloudcli update` या `npm install -g @cloudcli-ai/cloudcli@latest` न चलाएँ। HolyClaude patched CloudCLI runtime ship करता है; update के लिए `docker compose pull && docker compose up -d` उपयोग करें।

`latest` के बजाय specific version pin करने के लिए:

```yaml
image: coderluii/holyclaude:1.4.1   # instead of :latest
```

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :construction: समस्या निवारण

<details>
<summary><strong>CloudCLI गलत default directory दिखाता है</strong></summary>

CloudCLI `/workspace` के बजाय `/home/claude` पर खुलता है।

**कारण:** Custom या modified CloudCLI service script ने CloudCLI start करने से पहले `WORKSPACES_ROOT=/workspace` set नहीं किया।

**Fix:** HolyClaude में पहले से handled। s6 run script process environment में सीधे `WORKSPACES_ROOT=/workspace` सेट करता है।
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**कारण:** SMB/CIFS network mounts पर SQLite databases। CIFS उस file-level locking को support नहीं करता जो SQLite को चाहिए।

**Fix:** Network shares पर SQLite databases store न करें। HolyClaude इसी कारण container-local storage में `.cloudcli` रखता है। अगर आपके अपने SQLite databases `/workspace` में NAS पर हैं, तो उन्हें local path पर move करें।
</details>

<details>
<summary><strong>Chromium crashes / blank pages / tab failures</strong></summary>

**कारण:** अपर्याप्त shared memory। Docker defaults to 64MB।

**Fix:** अपने compose file में `shm_size: 2g` ensure करें। Heavy browser use (कई tabs, complex pages) के लिए `4g` तक बढ़ाएं।
</details>

<details>
<summary><strong>File watchers changes detect नहीं कर रहे (hot reload टूटा हुआ)</strong></summary>

**कारण:** SMB/CIFS network mounts `inotify` support नहीं करते।

**Fix:** अपने compose environment में polling enable करें:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
नोट: Polling inotify से ज़्यादा CPU उपयोग करता है। केवल network mounts पर enable करें।
</details>

<details>
<summary><strong>Permission denied errors</strong></summary>

**कारण:** Container UID/GID host file ownership से मेल नहीं खाता।

**Fix:**
```bash
# आपकी host machine पर
id -u  # → यह आपका PUID है
id -g  # → यह आपका PGID है
```
इन्हें अपने compose file में सेट करें:
```yaml
- PUID=1000
- PGID=1000
```
</details>

<details>
<summary><strong>Docker .claude.json को directory के रूप में create करता है</strong></summary>

**कारण:** अगर container start से पहले bind-mount target file exist नहीं करती, Docker इसे helpfully एक directory के रूप में create करता है। धन्यवाद, Docker।

**Fix:** पहले से handled — `entrypoint.sh` पहले saved session file restore करता है, या saved session न होने पर safe default file बनाता है।
</details>

सभी SMB/CIFS gotchas और उन bugs के पूरे इतिहास सहित complete guide के लिए [docs/troubleshooting.md](docs/troubleshooting.md) देखें जिन्हें हमने encounter और fix किया।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :warning: ज्ञात समस्याएं

ये HolyClaude bugs नहीं हैं — ये upstream issues या intentional trade-offs हैं।

| समस्या | क्यों | समाधान |
|-------|-----|------------|
| "Continue in Shell" button टूटा हुआ | CloudCLI upstream bug (terminal init में race condition) | इसके बजाय **Web Terminal** plugin उपयोग करें (pre-installed) |
| Cursor CLI "Command timeout" | कोई API key configure नहीं — केवल cosmetic, किसी चीज़ को affect नहीं करता | `CURSOR_API_KEY` सेट करें या ignore करें |
| Rebuild पर CloudCLI अकाउंट खो जाता है | SQLite network mounts पर persist नहीं कर सकता — intentional trade-off | अकाउंट दोबारा बनाएं (~10 सेकंड) |
| Web push notifications "not supported" | CloudCLI में browser limitation, standard behavior | इसके बजाय Apprise notifications उपयोग करें (देखें [सूचनाएं](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :hammer_and_wrench: लोकल बिल्ड

Docker Hub से pull करने के बजाय खुद image build करना चाहते हैं? करें:

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# Full image build करें
docker build -t holyclaude .

# Slim image build करें
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# ARM के लिए build करें (Apple Silicon, Raspberry Pi, AWS Graviton)
docker buildx build --platform linux/arm64 -t holyclaude .
```

फिर अपने compose file में `image: coderluii/holyclaude:latest` के बजाय `image: holyclaude` उपयोग करें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :bar_chart: विकल्प

HolyClaude अन्य approaches से कैसे compare करता है?

| Approach | Web UI | Multi-AI | Pre-configured tools | Headless browser | One command setup | Persistence |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLIs | 50+ tools | Chromium + Xvfb + Playwright | `docker compose up` | Bind mounts |
| Claude Code (bare metal) | नहीं | नहीं | खुद install करें | खुद install करें | Multi-step install | Manual |
| Claude Code + oh-my-openagent | नहीं | हां (multi-model) | कुछ | नहीं | npm install | Manual |
| DIY Docker + Claude Code | शायद | शायद | जो आप add करें | अगर आप configure करें | अगर आप Dockerfile लिखें | अगर आप volumes set up करें |
| Cursor IDE | Built-in | Cursor only | IDE-bundled | नहीं | Download app | App data |

HolyClaude coding agents के साथ compete नहीं कर रहा — यह वह **infrastructure layer** है जो उन सभी को बेहतर काम करने देती है। यह वह container है जिसके अंदर आप उन्हें चलाते हैं।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :rocket: रोडमैप

आगे क्या आ रहा है:

| स्थिति | Feature |
|--------|---------|
| 🔜 | **ARM-native builds** — optimized native ARM64 images, सिर्फ emulated नहीं |
| 🔜 | **VS Code tunnel integration** — VS Code desktop से connect करने के लिए built-in VS Code Server या tunnel |
| 🔜 | **Notification routing** — event type के अनुसार अलग notification destinations (errors Telegram पर, completions Discord पर) |

कोई idea है? [Discussion शुरू करें](https://github.com/CoderLuii/HolyClaude/discussions) या [feature request करें](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml)।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :trophy: HolyClaude से बनाया

HolyClaude से कुछ build कर रहे हैं? हम देखना चाहेंगे।

`showcase` label के साथ एक issue खोलें या अपना project यहां add करने के लिए PR submit करें:

<!-- Add your project: [Project Name](url) — one-line description -->

*यहां अपना project add करने वाले पहले बनें।*

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :handshake: योगदान

Contributions स्वागत योग्य हैं। यह project वास्तविक दैनिक उपयोग से जन्मा है, और यह तब बेहतर होता है जब अधिक लोग इसे उपयोग करते हैं और edge cases ढूंढते हैं।

1. Fork करें
2. Branch करें (`git checkout -b feature/something`)
3. Commit करें
4. Push करें
5. PR करें

Bugs, feature requests, questions: [issue खोलें](https://github.com/CoderLuii/HolyClaude/issues)।

### संपर्क करें

| Channel | किसके लिए उपयोग करें |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Questions, अपना setup share करें, ideas |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Bug reports, feature और package requests |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Vulnerability reports (private) |

### कोई टूल add करवाना चाहते हैं?

[📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml) issue template उपयोग करें। Package name, install method, और कौन सा variant (full/slim) target होना चाहिए, include करें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :heart: समर्थन

HolyClaude मुफ़्त, ओपन सोर्स है, और एक developer द्वारा maintain किया जाता है जो इसे हर दिन उपयोग करता है।

अगर इसने आपका time बचाया, तो यहां आप कैसे help कर सकते हैं:

- **इस repo को Star करें** — visibility के लिए यह सबसे बड़ी चीज़ है जो आप कर सकते हैं
- **Share करें** — किसी दोस्त को बताएं, post करें, tweet करें
- **Issues खोलें** — bug reports और feature requests HolyClaude को सभी के लिए बेहतर बनाते हैं
- **Contribute करें** — PRs हमेशा welcome हैं

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :scroll: थर्ड-पार्टी सॉफ़्टवेयर

HolyClaude Docker image में third-party software शामिल है, जिनमें से प्रत्येक अपने own license के अंतर्गत है। Notable components:

| Component | License | Source |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

पूरी details के लिए [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) देखें जिसमें modification notices शामिल हैं। HolyClaude का अपना source code MIT licensed है।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

## :page_facing_up: लाइसेंस

MIT — [LICENSE](LICENSE) देखें। इसे जैसे चाहें उपयोग करें।

<p align="right">
  <a href="#top">↑ शीर्ष पर वापस जाएं</a>
</p>

---

<!-- Star History -->
<div align="center">
<a href="https://star-history.com/#CoderLuii/HolyClaude&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date" width="600" />
  </picture>
</a>
</div>

---

<div align="center">

[CoderLuii](https://github.com/coderluii) द्वारा बनाया गया · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

यह container वही है जो मैं हर दिन उपयोग करता हूं। अगर इसने आपका आधा भी setup time बचाया जो इसने मेरा बचाया, तो एक star अच्छा लगेगा।

</div>
