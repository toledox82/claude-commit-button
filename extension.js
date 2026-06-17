const vscode = require('vscode')
const { execFile } = require('child_process')
const fs = require('fs')

let cachedCli = null

function detectClaude() {
	return new Promise((resolve) => {
		const finder = process.platform === 'win32' ? 'where' : 'which'
		execFile(finder, ['claude'], { timeout: 5000 }, (err, stdout) => {
			if (err || !stdout) return resolve(null)
			const first = String(stdout)
				.split(/\r?\n/)
				.map((s) => s.trim())
				.filter(Boolean)[0]
			resolve(first || null)
		})
	})
}

async function resolveCli() {
	const configured = vscode.workspace.getConfiguration('claudeCommitButton').get('cliPath')
	if (configured && configured.trim()) return configured.trim()
	if (cachedCli && fs.existsSync(cachedCli)) return cachedCli
	const found = await detectClaude()
	if (found) {
		cachedCli = found
		return found
	}
	return 'claude'
}

function activate(context) {
	const disposable = vscode.commands.registerCommand('claudeCommitButton.generate', async (arg) => {
		const gitExt = vscode.extensions.getExtension('vscode.git')
		const git = gitExt && gitExt.exports && gitExt.exports.getAPI(1)
		if (!git) {
			vscode.window.showErrorMessage('Git extension not found.')
			return
		}

		// Resolve the repository (the scm menu passes the SourceControl as arg)
		let repo = null
		if (arg && arg.rootUri) {
			repo = git.repositories.find((r) => r.rootUri.toString() === arg.rootUri.toString())
		}
		if (!repo) repo = git.repositories[0]
		if (!repo) {
			vscode.window.showErrorMessage('No Git repository.')
			return
		}

		// Diff: staged first, fall back to working tree
		let diff = await repo.diff(true)
		if (!diff || !diff.trim()) diff = await repo.diff(false)
		if (!diff || !diff.trim()) {
			vscode.window.showWarningMessage('No changes.')
			return
		}

		const MAX = 6000
		if (diff.length > MAX) diff = diff.slice(0, MAX) + '\n...[truncated]'

		const cfg = vscode.workspace.getConfiguration('claudeCommitButton')
		const claudePath = await resolveCli()
		const model = cfg.get('model') || 'sonnet'
		const effort = cfg.get('effort') || 'low'

		const prompt =
			'Write a concise git commit message for the diff below. ' +
			'Imperative mood, conventional style. ' +
			'Reply with the message only (short subject line; blank line and brief body if needed). ' +
			'No backticks, no explanation, no surrounding quotes.\n\nDIFF:\n' +
			diff

		await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.SourceControl, title: 'Claude: generating…' },
			() =>
				new Promise((resolve) => {
					const args = [
						'-p',
						'--model',
						model,
						'--effort',
						effort,
						'--no-session-persistence',
						'--tools',
						'',
						'--strict-mcp-config',
						'--setting-sources',
						'',
						'--dangerously-skip-permissions',
					]
					const child = execFile(
						claudePath,
						args,
						{ maxBuffer: 10 * 1024 * 1024, cwd: repo.rootUri.fsPath },
						(err, stdout, stderr) => {
							if (err) {
								vscode.window.showErrorMessage('Claude failed: ' + (stderr || err.message))
								resolve()
								return
							}
							const msg = (stdout || '').trim()
							if (msg) {
								repo.inputBox.value = msg
							} else {
								vscode.window.showWarningMessage('Claude returned empty.')
							}
							resolve()
						},
					)
					child.stdin.write(prompt)
					child.stdin.end()
				}),
		)
	})

	context.subscriptions.push(disposable)
}

function deactivate() {}

module.exports = { activate, deactivate }
