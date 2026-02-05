<div align="center">

<pre>
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ██████╗ ██████╗ ██████╗  ██████╗██╗  ██╗███████╗███████╗████████╗██████╗  █████╗ ║
║  ██╔════╝██╔═══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗║
║  ██║     ██║   ██║██║  ██║██║     ███████║███████╗█████╗     ██║   ██████╔╝███████║║
║  ██║     ██║   ██║██║  ██║██║     ██╔══██║╚════██║██╔══╝     ██║   ██╔══██╗██╔══██║║
║  ╚██████╗╚██████╔╝██████╔╝╚██████╗██║  ██║███████║███████╗   ██║   ██║  ██║██║  ██║║
║   ╚═════╝ ╚═════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝║
║                                                                               ║
║  Loop-based AI Orchestration for the Terminal                                ║
║  "The AI is the worker. Codchestra is the conductor."                        ║
║                                                                               ║
║  Created by: Mustafa Kemal Çıngıl                                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
</pre>

<strong>🚀 Autonomous AI orchestration CLI — Codex & ChatGPT</strong>

<br/><br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

<br/>

---

## ✨ Features

Codchestra is a terminal-native development orchestrator that runs an AI coding agent (Codex or ChatGPT CLI) in a loop until all tasks are complete. You define tasks in `codchestra.tasks.md`; Codchestra feeds context and prompts to the AI, parses STATUS blocks, and stops when the AI signals completion or when limits (max loops, timeout, stagnation) are hit.

| Feature | Description |
|--------|-------------|
| 🔁 **Loop engine** | Max loops, repeated-output detection, stagnation detection, per-call timeout |
| 📋 **Task system** | Markdown task list (`codchestra.tasks.md`) — pending / in-progress / done |
| ⚙️ **Config** | `.codchestrarc` — maxLoops, timeoutMinutes, aiCommand, verbosity, outputFormat |
| 🤖 **Codex & ChatGPT** | Default: `chatgpt` or `codex`; non-interactive exec, stdin prompt, workspace-write |
| 📊 **Live TUI** | Banner + loop status + last STATUS + errors (TTY); session logs in `.codchestra/logs/` |
| ✏️ **Prompt UI** | Run starts with prompt choice: Enter = default, e = add task, c = custom (paste in terminal) |
| 🔌 **Plugins** | `.codchestra/plugins/` — beforeRun, afterRun, beforeLoop, afterLoop |

---

## 🚀 Quick Start

### Install

```bash
npm install -g @mustafakemal0146/codchestra
```

Or from source:

```bash
git clone https://github.com/mustafakemal0146/codchestra.git
cd codchestra
npm install
npm run build
npm link
```

### Run

```bash
cd your-project
codchestra init
# Edit codchestra.tasks.md with [ ], [-], [x] tasks
codchestra run
```

- **Enter** = start with default prompt  
- **e** = add a task (multi-line in terminal, empty line + Enter to finish)  
- **c** = custom prompt (paste in terminal, empty line + Enter to finish)

---

## 📋 Commands

| Command | Description |
|--------|-------------|
| `codchestra init` | Create `.codchestra/`, `codchestra.tasks.md`, `CODCHESTRA_PROMPT.md`, `.codchestrarc` |
| `codchestra run` | Prompt UI → AI loop (Codex/ChatGPT) until exit or limits |
| `codchestra status` | Show run state and task progress |
| `codchestra reset` | Clear `.codchestra` state |
| `codchestra tasks` | List tasks (option: `--json`) |
| `codchestra monitor` | Live dashboard (loop #, progress, stagnation) |
| `codchestra doctor` | Check environment and config |

---

## 🤖 AI: Codex & ChatGPT

- **Default:** Tries `chatgpt`, then `codex` on PATH.
- **chatgpt:** Prompt sent via stdin.
- **Codex (OpenAI):** `codex exec - --full-auto -s workspace-write -C <cwd> --skip-git-repo-check -`; prompt from stdin. Install: `npm i -g @openai/codex`. Run `codex login` if needed.
- **Override:** In `.codchestrarc` set `aiCommand` and optionally `aiArgs`.

---

## 📄 STATUS block

The AI must end each response with:

```
STATUS:
progress: <0-100>
tasks_completed: <number>
tasks_total: <number>
EXIT_SIGNAL: <true|false>
summary: <one line>
```

Codchestra stops successfully when `EXIT_SIGNAL: true` and all tasks are `[x]`. Use `CODCHESTRA_PROMPT.md` in the project to enforce this.

---

## ⚙️ Config (`.codchestrarc`)

| Key | Default | Description |
|-----|---------|-------------|
| `maxLoops` | 50 | Max loop iterations |
| `timeoutMinutes` | 120 | Wall-clock timeout |
| `aiCallTimeoutMinutes` | 10 | Per-call AI timeout |
| `aiCommand` | `""` | Override AI CLI (default: chatgpt/codex) |
| `aiArgs` | (auto for codex) | Extra args (e.g. for codex exec) |
| `verbosity` | `"normal"` | quiet \| normal \| verbose |
| `outputFormat` | `"text"` | text \| json |

---

## 🔌 Plugins

Place `.js` plugins in `.codchestra/plugins/`. Each module can export:

- `name`: string  
- `beforeRun(cwd)`  
- `afterRun(cwd, result)`  
- `beforeLoop({ cwd, loop })`  
- `afterLoop({ cwd, loop, stdout })`

---

## 📁 Project structure

```
codchestra/
├── src/
│   ├── cli/          # Commands: init, run, status, reset, tasks, monitor, doctor
│   ├── config/       # .codchestrarc loader
│   ├── core/         # State, exit analyzer (STATUS parse)
│   ├── loop/         # Runner, live UI
│   ├── tasks/        # Task parser & manager
│   ├── plugins/      # Plugin loader
│   └── utils/        # Logger, session log, paths, git, aiCommand
├── CODCHESTRA_PROMPT.md
├── package.json
└── README.md
```

---

## 🛠️ Development

```bash
npm install
npm run build
npm run test
```

---

## 👨‍💻 Author

**Mustafa Kemal Çıngıl** — [github.com/mustafakemal0146](https://github.com/mustafakemal0146)

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**Codchestra — The AI is the worker. Codchestra is the conductor.**

</div>
