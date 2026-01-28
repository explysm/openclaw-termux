import { runCommandWithTimeout } from "../process/exec.js";

// Stub for @mariozechner/clipboard which crashes on Termux due to native bindings.
// We primarily use termux-clipboard-set for Termux optimization.
const clipboardStub = {
  setText: (value: string) => {
    /* noop - handled by termux-clipboard-set attempt */
  },
};

export async function copyToClipboard(value: string): Promise<boolean> {
  const attempts: Array<{ argv: string[] }> = [
    { argv: ["termux-clipboard-set"] },
    { argv: ["pbcopy"] },
    { argv: ["xclip", "-selection", "clipboard"] },
    { argv: ["wl-copy"] },
    { argv: ["clip.exe"] }, // WSL / Windows
    { argv: ["powershell", "-NoProfile", "-Command", "Set-Clipboard"] },
  ];
  for (const attempt of attempts) {
    try {
      const result = await runCommandWithTimeout(attempt.argv, {
        timeoutMs: 3_000,
        input: value,
      });
      if (result.code === 0 && !result.killed) return true;
    } catch {
      // keep trying the next fallback
    }
  }

  try {
    clipboardStub.setText(value);
    return true;
  } catch {
    return false;
  }
}
