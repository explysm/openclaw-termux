import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { colorize, isRich, theme } from "../terminal/theme.js";
import { formatGatewayServiceDescription } from "./constants.js";
import type { GatewayServiceRuntime } from "./service-runtime.js";
import type { GatewayServiceInstallArgs } from "./service.js";

const execFileAsync = promisify(execFile);

const formatLine = (label: string, value: string) => {
  const rich = isRich();
  return `${colorize(rich, theme.muted, `${label}:`)} ${colorize(rich, theme.command, value)}`;
};

function resolvePrefix(): string {
  return process.env.PREFIX || "/data/data/com.termux/files/usr";
}

function resolveServiceDir(profile?: string): string {
  const name = profile ? `moltbot-gateway-${profile}` : "moltbot-gateway";
  return path.join(resolvePrefix(), "var", "service", name);
}

export async function isTermuxServiceAvailable(): Promise<boolean> {
  try {
    await execFileAsync("which", ["sv-enable"]);
    return true;
  } catch {
    return false;
  }
}

async function assertTermuxServiceAvailable() {
  if (!(await isTermuxServiceAvailable())) {
    throw new Error(
      "termux-services not found. Please install it with: pkg install termux-services",
    );
  }
}

export async function installTermuxService({
  env,
  stdout,
  programArguments,
  workingDirectory,
  environment,
  description,
}: GatewayServiceInstallArgs): Promise<void> {
  await assertTermuxServiceAvailable();

  const serviceDir = resolveServiceDir(env.CLAWDBOT_PROFILE);
  const runFile = path.join(serviceDir, "run");
  const logDir = path.join(serviceDir, "log");
  const logRunFile = path.join(logDir, "run");

  await fs.mkdir(logDir, { recursive: true });

  const serviceDescription = 
    description ??
    formatGatewayServiceDescription({
      profile: env.CLAWDBOT_PROFILE,
      version: environment?.CLAWDBOT_SERVICE_VERSION ?? env.CLAWDBOT_SERVICE_VERSION,
    });

  // Build run script
  const envHeader = Object.entries(environment ?? {})
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `export ${k}="${v}"`) // Corrected escaping for quotes within the export statement
    .join("\n"); // Corrected escaping for newline character

  const runScript = `#!/data/data/com.termux/files/usr/bin/sh
${serviceDescription ? `# ${serviceDescription}` : ""}
${envHeader}
${workingDirectory ? `cd "${workingDirectory}"` : ""}
# Ensure the process stays alive when the screen is off
if command -v termux-wake-lock > /dev/null; then
  termux-wake-lock
fi
exec ${programArguments.join(" ")} 2>&1
`;

  const logRunScript = `#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt .
`;

  await fs.writeFile(runFile, runScript, { mode: 0o755 });
  await fs.writeFile(logRunFile, logRunScript, { mode: 0o755 });

  const serviceName = path.basename(serviceDir);
  await execFileAsync("sv-enable", [serviceName]);

  stdout.write("\n");
  stdout.write(`${formatLine("Installed Termux service", runFile)}\n`);
  stdout.write(`${formatLine("Logs available at", path.join(serviceDir, "log", "current"))}\n`);
}

export async function uninstallTermuxService({
  env,
  stdout,
}: { 
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
}): Promise<void> {
  const serviceDir = resolveServiceDir(env.CLAWDBOT_PROFILE);
  const serviceName = path.basename(serviceDir);

  try {
    await execFileAsync("sv-disable", [serviceName]);
  } catch {
    // ignore
  }

  try {
    await fs.rm(serviceDir, { recursive: true, force: true });
    stdout.write(`${formatLine("Removed Termux service", serviceDir)}\n`);
  } catch (err) {
    stdout.write(`Failed to remove Termux service directory: ${String(err)}\n`);
  }
}

export async function stopTermuxService({
  env,
  stdout,
}: {
  env?: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
}): Promise<void> {
  const serviceDir = resolveServiceDir(env?.CLAWDBOT_PROFILE);
  const serviceName = path.basename(serviceDir);
  await execFileAsync("sv", ["down", serviceName]);
  stdout.write(`${formatLine("Stopped Termux service", serviceName)}\n`);
}

export async function restartTermuxService({
  env,
  stdout,
}: {
  env?: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream;
}): Promise<void> {
  const serviceDir = resolveServiceDir(env?.CLAWDBOT_PROFILE);
  const serviceName = path.basename(serviceDir);
  await execFileAsync("sv", ["restart", serviceName]);
  stdout.write(`${formatLine("Restarted Termux service", serviceName)}\n`);
}

export async function isTermuxServiceLoaded(args: {
  env?: Record<string, string | undefined>;
}): Promise<boolean> {
  const serviceDir = resolveServiceDir(args.env?.CLAWDBOT_PROFILE);
  try {
    await fs.access(path.join(serviceDir, "run"));
    return true;
  } catch {
    return false;
  }
}

export async function readTermuxServiceCommand(
  env: Record<string, string | undefined>,
): Promise<{
  programArguments: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  sourcePath?: string;
} | null> {
  const serviceDir = resolveServiceDir(env.CLAWDBOT_PROFILE);
  const runFile = path.join(serviceDir, "run");
  try {
    const content = await fs.readFile(runFile, "utf8");
    const lines = content.split("\n");
    let workingDirectory: string | undefined;
    const environment: Record<string, string> = {};
    let execLine = "";

    for (const line of lines) {
      if (line.startsWith("export ")) {
        const match = line.match(/^export (.*?)=\"(.*?)\"$/);
        if (match) environment[match[1]] = match[2];
      } else if (line.startsWith("cd \"")) {
        const match = line.match(/^cd \"(.*?)\"$/);
        if (match) workingDirectory = match[1];
      } else if (line.startsWith("exec ")) {
        execLine = line.slice("exec ".length).trim();
      }
    }

    if (!execLine) return null;

    // Basic split for execLine - might need better shell-quote parsing if args have spaces
    const programArguments = execLine.split(" ").filter(Boolean);
    // Remove redirection if present (e.g. 2>&1)
    const lastArg = programArguments[programArguments.length - 1];
    if (lastArg === "2>&1") programArguments.pop();

    return {
      programArguments,
      workingDirectory,
      environment,
      sourcePath: runFile,
    };
  } catch {
    return null;
  }
}

export async function readTermuxServiceRuntime(
  env: Record<string, string | undefined>,
): Promise<GatewayServiceRuntime> {
  const serviceDir = resolveServiceDir(env.CLAWDBOT_PROFILE);
  const serviceName = path.basename(serviceDir);

  try {
    const { stdout } = await execFileAsync("sv", ["status", serviceName]);
    // Output format: "run: moltbot-gateway: (pid 1234) 10s; run: log: (pid 1235) 10s"
    const match = stdout.match(/^run: (.*?): \(pid (\d+)\) (\d+)s/);
    if (match) {
      return {
        status: "running",
        pid: Number.parseInt(match[2], 10),
        detail: stdout.trim(),
      };
    }
    return {
      status: "stopped",
      detail: stdout.trim(),
    };
  } catch (err) {
    return {
      status: "unknown",
      detail: String(err),
    };
  }
}
