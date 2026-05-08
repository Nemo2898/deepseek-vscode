import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TERMINAL_NAME = 'DeepSeek TUI';
const BINARY_NAME = 'deepseek-tui';
const STORED_PATH_KEY = 'binaryPath';

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'deepseek-tui.open';
  statusBarItem.text = '$(terminal) DeepSeek';
  statusBarItem.tooltip = 'Open DeepSeek TUI';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('deepseek-tui.open', () => openDeepSeek(context))
  );
}

async function openDeepSeek(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('deepseek-tui');
  const configPath = config.get<string>('binaryPath', BINARY_NAME);

  const storedPath = context.globalState.get<string>(STORED_PATH_KEY);
  let resolved: string | null = null;

  if (configPath !== BINARY_NAME) {
    if (await isExecutable(configPath)) {
      resolved = configPath;
    }
  }

  if (!resolved && storedPath && await isExecutable(storedPath)) {
    resolved = storedPath;
  }

  if (!resolved) {
    resolved = await resolveBinary();
  }

  if (!resolved) {
    const action = await vscode.window.showErrorMessage(
      `deepseek-tui not found. Install:\n  cargo install deepseek-tui\n  npm install -g deepseek-tui`,
      'Configure Path'
    );
    if (action === 'Configure Path') {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'deepseek-tui.binaryPath'
      );
    }
    return;
  }

  context.globalState.update(STORED_PATH_KEY, resolved);

  let terminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME);
  const isNew = !terminal;
  if (!terminal) {
    terminal = vscode.window.createTerminal(TERMINAL_NAME);
  }

  terminal.show();
  if (isNew) {
    terminal.sendText(resolved);
  }
}

async function resolveBinary(): Promise<string | null> {
  const isWin = process.platform === 'win32';

  // cargo: ~/.cargo/bin/deepseek-tui[.exe]
  const cargoExt = isWin ? '.exe' : '';
  const cargoBin = path.join(os.homedir(), '.cargo', 'bin', BINARY_NAME + cargoExt);
  if (await isExecutable(cargoBin)) return cargoBin;

  // npm
  try {
    await exec('npm', ['list', '-g', 'deepseek-tui']);
    const prefix = (await exec('npm', ['prefix', '-g'])).trim();

    if (isWin) {
      for (const ext of ['.cmd', '.ps1', '']) {
        const npmBin = path.join(prefix, BINARY_NAME + ext);
        if (await isExecutable(npmBin)) return npmBin;
      }
    } else {
      const npmBin = path.join(prefix, 'bin', BINARY_NAME);
      if (await isExecutable(npmBin)) return npmBin;
    }
  } catch {}

  return null;
}

function isExecutable(filePath: string): Promise<boolean> {
  return fs.promises.access(filePath, fs.constants.X_OK)
    .then(() => true)
    .catch(() => false);
}

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.execFile(cmd, args, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

export function deactivate() {}
