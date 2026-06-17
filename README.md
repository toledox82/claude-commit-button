# Claude Commit Button

Generate git commit messages with the [Claude CLI](https://docs.claude.com/en/docs/claude-code), straight from VS Code's Source Control panel.

A ✨ button appears in the Source Control toolbar. Click it: the extension reads your diff (staged, or the whole working tree if nothing is staged), asks Claude for a concise commit message, and fills the commit input box.

## Requirements

- The [Claude CLI](https://docs.claude.com/en/docs/claude-code) installed and authenticated (`claude --version` should work in your terminal).

## Install

1. Download the `.vsix` from the [Releases](https://github.com/toledointeractive/claude-commit-button/releases) page.
2. In VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX…** → pick the file.
3. Reload the window.

## Usage

Open the Source Control panel and click the ✨ button next to **CHANGES**.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `claudeCommitButton.cliPath` | `""` | Path to the Claude CLI. Empty = auto-detect from PATH. |
| `claudeCommitButton.model` | `sonnet` | Model used to generate the message. |
| `claudeCommitButton.effort` | `low` | Effort level (`low`–`max`). |

## Optional: button inside the message box

Putting the button *inside* the commit message box (Copilot-style) needs VS Code's
proposed `scm/inputBox` API, which only works locally:

1. Add to the extension's `package.json`:
   ```json
   "enabledApiProposals": ["contribSourceControlInputBoxMenu"],
   ```
   and a `scm/inputBox` entry mirroring the `scm/title` one.
2. Add the extension id to `~/.vscode/argv.json`:
   ```json
   "enable-proposed-api": ["marciotoledo.claude-commit-button"]
   ```
3. Fully restart VS Code.

This cannot be shipped in a published/distributed build.

## License

MIT © [Marcio Toledo](https://marciotoledo.com)
