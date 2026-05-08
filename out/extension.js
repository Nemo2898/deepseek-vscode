"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const TERMINAL_NAME = 'DeepSeek TUI';
const BINARY_NAME = 'deepseek-tui';
const STORED_PATH_KEY = 'binaryPath';
function activate(context) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'deepseek-tui.open';
    statusBarItem.text = '$(terminal) DeepSeek';
    statusBarItem.tooltip = 'Open DeepSeek TUI';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(vscode.commands.registerCommand('deepseek-tui.open', () => openDeepSeek(context)));
}
async function openDeepSeek(context) {
    const config = vscode.workspace.getConfiguration('deepseek-tui');
    const configPath = config.get('binaryPath', BINARY_NAME);
    const storedPath = context.globalState.get(STORED_PATH_KEY);
    let resolved = null;
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
        const action = await vscode.window.showErrorMessage(`deepseek-tui not found. Install:\n  cargo install deepseek-tui\n  npm install -g deepseek-tui`, 'Configure Path');
        if (action === 'Configure Path') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'deepseek-tui.binaryPath');
        }
        return;
    }
    context.globalState.update(STORED_PATH_KEY, resolved);
    let terminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME);
    if (!terminal) {
        terminal = vscode.window.createTerminal(TERMINAL_NAME);
    }
    terminal.show();
    terminal.sendText(resolved);
}
async function resolveBinary() {
    const cargoBin = `${os.homedir()}/.cargo/bin/${BINARY_NAME}`;
    if (await isExecutable(cargoBin))
        return cargoBin;
    try {
        await exec('npm', ['list', '-g', 'deepseek-tui']);
        const prefix = (await exec('npm', ['prefix', '-g'])).trim();
        const npmBin = `${prefix}/bin/${BINARY_NAME}`;
        if (await isExecutable(npmBin))
            return npmBin;
    }
    catch { }
    return null;
}
function isExecutable(filePath) {
    return fs.promises.access(filePath, fs.constants.X_OK)
        .then(() => true)
        .catch(() => false);
}
function exec(cmd, args) {
    return new Promise((resolve, reject) => {
        cp.execFile(cmd, args, (err, stdout) => {
            if (err)
                reject(err);
            else
                resolve(stdout);
        });
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map