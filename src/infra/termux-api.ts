import { spawn } from "node:child_process";

import { runCommandWithTimeout } from "../process/exec.js";

/**
 * Checks if we are running in a Termux environment.
 */
export function isTermux(): boolean {
  return Boolean(process.env.TERMUX_VERSION);
}

/**
 * Sends a notification using termux-notification.
 */
export async function sendTermuxNotification(params: {
  title?: string;
  content: string;
  id?: string;
  group?: string;
  priority?: "low" | "normal" | "high";
  onGoing?: boolean;
  sound?: boolean;
}): Promise<boolean> {
  if (!isTermux()) return false;

  const args = ["-c", params.content];
  if (params.title) args.push("-t", params.title);
  if (params.id) args.push("--id", params.id);
  if (params.group) args.push("-g", params.group);
  if (params.priority) args.push("--priority", params.priority);
  if (params.onGoing) args.push("--ongoing");
  if (params.sound) args.push("--sound");

  return new Promise((resolve) => {
    const child = spawn("termux-notification", args, { stdio: "ignore" });
    child.on("exit", (code) => {
      resolve(code === 0);
    });
    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Vibrate the device using termux-vibrate.
 */
export async function termuxVibrate(durationMs = 100): Promise<boolean> {
  if (!isTermux()) return false;

  return new Promise((resolve) => {
    const child = spawn("termux-vibrate", ["-d", durationMs.toString()], { stdio: "ignore" });
    child.on("exit", (code) => {
      resolve(code === 0);
    });
    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Displays a toast message using termux-toast.
 */
export async function termuxToast(message: string, short = true): Promise<boolean> {
  if (!isTermux()) return false;

  const args = [message];
  if (short) args.push("-s");

  return new Promise((resolve) => {
    const child = spawn("termux-toast", args, { stdio: "ignore" });
    child.on("exit", (code) => {
      resolve(code === 0);
    });
    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Gets the battery status using termux-battery-status.
 */
export async function getTermuxBatteryStatus(): Promise<any | null> {
  if (!isTermux()) return null;

  try {
    const result = await runCommandWithTimeout(["termux-battery-status"], 5000);
    if (result.code === 0) {
      return JSON.parse(result.stdout);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Gets the clipboard content using termux-clipboard-get.
 */
export async function getTermuxClipboard(): Promise<string | null> {
  if (!isTermux()) return null;

  try {
    const result = await runCommandWithTimeout(["termux-clipboard-get"], 5000);
    if (result.code === 0) {
      return result.stdout.trim();
    }
  } catch {
    // Ignore errors
  }
  return null;
}
