# Codchestra

Production-grade autonomous AI orchestration CLI.

**Author:** Mustafa Kemal Çıngıl — [github.com/mustafakemal0146](https://github.com/mustafakemal0146)

## RUN THIS

```bash
# Create repo and install
cd Codchestra
npm install

# Build and test
npm run build
npm run test

# Link globally and run
npm link
codchestra init
codchestra doctor
codchestra tasks
# codchestra run   # requires chatgpt or codex on PATH
```

Codchestra is a terminal-native development orchestrator that runs an AI coding agent (Codex/ChatGPT CLI) in a loop until all tasks are complete. The AI is the worker; Codchestra is the conductor.

- **Cross-platform**: macOS, Linux, Windows (PowerShell + Windows Terminal). No bash-only assumptions.
- **Loop engine**: max loops, repeated-output detection, stagnation detection, timeout.
- **Task system**: markdown task list (`codchestra.tasks.md`) with pending / in-progress / done.
- **Config**: `.codchestrarc` (JSON) for `maxLoops`, `timeoutMinutes`, `aiCommand`, `verbosity`, `outputFormat`.
- **Plugins**: load from `.codchestra/plugins` with lifecycle hooks.

## Install

```bash
npm install -g @mustafakemal0146/codchestra
```

Or from source (GitHub):

```bash
git clone https://github.com/mustafakemal0146/codchestra.git
cd codchestra
npm install
npm run build
npm link
```

## Quick start

```bash
cd your-project
codchestra init
# Edit codchestra.tasks.md with [ ], [-], [x] tasks
codchestra run
```

## Commands

| Command | Description |
|--------|-------------|
| `codchestra init` | Create `.codchestra/`, `codchestra.tasks.md`, `CODCHESTRA_PROMPT.md`, `.codchestrarc` |
| `codchestra run` | Run the AI loop until exit signal + all tasks done, or limits hit |
| `codchestra status` | Show run state and task progress |
| `codchestra reset` | Clear `.codchestra` state |
| `codchestra tasks` | List tasks (option: `--json`) |
| `codchestra monitor` | Live dashboard (loop #, progress, stagnation) |
| `codchestra doctor` | Check environment and config |

## AI command (chatgpt / Codex uyumluluğu)

- **Varsayılan:** Önce `chatgpt`, yoksa `codex` denenir.
- **chatgpt:** Prompt **stdin** ile gönderilir (`args: []`). Stdin destekleyen herhangi bir chatgpt CLI ile uyumludur.
- **Codex (OpenAI):** Komut `codex` ise otomatik olarak **non-interactive** mod kullanılır: `codex exec - --full-auto`; prompt stdin’den okunur. Resmi paket: `npm i -g @openai/codex`. Dokümandaki **codex exec**, PROMPT `-` (stdin) ve **--full-auto** ile tam uyumlu.

`.codchestrarc` ile override:

```json
{
  "aiCommand": "codex",
  "aiArgs": ["exec", "-", "--full-auto"]
}
```

Sadece `aiCommand` verirsen Codex için `aiArgs` otomatik eklenir. Farklı bir CLI kullanıyorsan (örn. `npx chatgpt`) `aiCommand` yeterli, `aiArgs` boş bırakılır.

## Exit rule

Codchestra stops when:

- **Success**: AI outputs `EXIT_SIGNAL: true` **and** all tasks in `codchestra.tasks.md` are `[x]`.
- **Limits**: max loops, timeout, stagnation (no file changes for N loops), or repeated identical output.

## STATUS block

The AI must end each response with:

```
STATUS:
progress: <0-100>
tasks_completed: <number>
tasks_total: <number>
EXIT_SIGNAL: <true|false>
summary: <one line>
```

Use `CODCHESTRA_PROMPT.md` in the project to enforce this.

## Config (`.codchestrarc`)

| Key | Default | Description |
|-----|---------|-------------|
| `maxLoops` | 50 | Max loop iterations |
| `timeoutMinutes` | 120 | Wall-clock timeout |
| `aiCommand` | `""` | Override AI CLI (default: chatgpt/codex) |
| `verbosity` | `"normal"` | quiet \| normal \| verbose |
| `outputFormat` | `"text"` | text \| json (for status/tasks) |

## Plugins

Place `.js` plugins in `.codchestra/plugins/`. Each module can export:

- `name`: string
- `beforeRun(cwd)`
- `afterRun(cwd, result)`
- `beforeLoop({ cwd, loop })`
- `afterLoop({ cwd, loop, stdout })`

## GitHub & npm

Proje hem **GitHub** hem **npm** için hazırdır.

**GitHub’a yükleme:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/mustafakemal0146/codchestra.git
git branch -M main
git push -u origin main
```

**npm’e yayınlama:**
```bash
npm login
npm run build
npm publish
```
Yayından sonra paket: [npmjs.com/package/codchestra](https://www.npmjs.com/package/@mustafakemal0146/codchestra)

- **GitHub:** [github.com/mustafakemal0146/codchestra](https://github.com/mustafakemal0146/codchestra)
- **npm:** `npm install -g @mustafakemal0146/codchestra`

## Development

```bash
npm install
npm run build
npm run test
```

## License

MIT

---

**Codchestra** — by [Mustafa Kemal Çıngıl](https://github.com/mustafakemal0146)
