import { spawn, spawnSync, ChildProcess } from "node:child_process";
import { existsSync, readFileSync, createWriteStream } from "node:fs";
import { Writable } from "node:stream";
import { Writable } from "node:stream"; // Added Writable
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import type { MoltbotConfig } from "../config/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GATEWAY_PORT = 18789;
const API_SERVER_PORT = 5039;
const TTYD_PORT = 7681;
const LOG_FILE = join(homedir(), ".moltbot", "android-gateway.log"); // Central log for gateway output

let gatewayProcess: ChildProcessWithoutNullStreams | null = null;
let ttydProcess: ChildProcessWithoutNullStreams | null = null;
let wakeLockActive = false;

// Acquire Termux wake lock
function acquireWakeLock() {
  if (spawnSync("termux-wake-lock").status === 0) {
    console.log("Termux wake lock acquired.");
    wakeLockActive = true;
  } else {
    console.warn("Could not acquire Termux wake lock. Ensure termux-api is installed.");
  }
}

// Release Termux wake lock
function releaseWakeLock() {
  if (wakeLockActive && spawnSync("termux-wake-unlock").status === 0) {
    console.log("Termux wake lock released.");
    wakeLockActive = false;
  } else if (wakeLockActive) {
    console.warn("Could not release Termux wake lock.");
  }
}

// Start Moltbot Gateway
async function startGateway() {
  if (gatewayProcess && !gatewayProcess.killed) {
    console.log("Moltbot Gateway is already running.");
    return;
  }

  const moltbotExecutable = "moltbot"; // Assuming 'moltbot' is in PATH
  const args = ["gateway", "--port", String(GATEWAY_PORT), "--verbose", "--bind", "127.0.0.1"]; // Added --bind 127.0.0.1
  
  const logStream = createWriteStream(LOG_FILE, { flags: 'a' });

  gatewayProcess = spawn(moltbotExecutable, args, {
    stdio: ['ignore', logStream, logStream],
    detached: true,
    env: { ...process.env },
  }) as ChildProcessWithoutNullStreams;

  gatewayProcess.unref(); // Allow the Node.js event loop to exit without waiting for the child process

  gatewayProcess.on("error", (err) => {
    console.error(`Moltbot Gateway process error: ${err.message}`);
    gatewayProcess = null;
    releaseWakeLock();
  });

  gatewayProcess.on("exit", (code, signal) => {
    console.log(`Moltbot Gateway process exited with code ${code}, signal ${signal}`);
    gatewayProcess = null;
    releaseWakeLock();
  });

  console.log(`Moltbot Gateway started with PID: ${gatewayProcess.pid}`);
  acquireWakeLock();
}

// Stop Moltbot Gateway
function stopGateway() {
  if (gatewayProcess) {
    console.log(`Attempting to stop Moltbot Gateway PID: ${gatewayProcess.pid}`);
    try {
      process.kill(-gatewayProcess.pid!, 'SIGINT'); // Send SIGINT to the process group
      gatewayProcess = null;
      releaseWakeLock();
      console.log("Moltbot Gateway stopped.");
    } catch (error) {
      console.error(`Error stopping Moltbot Gateway: ${error.message}`);
    }
  } else {
    console.log("Moltbot Gateway is not running.");
  }
}

// Get Gateway Status
function getGatewayStatus() {
  const running = Boolean(gatewayProcess && !gatewayProcess.killed);
  const pid = gatewayProcess?.pid || null;
  // Uptime calculation would require more complex tracking, or parsing 'ps' output.
  // For simplicity, just indicate if running.
  return { running, pid, uptime: running ? "running" : "stopped" };
}

// Get Chat Logs/Messages
function getChatLogs(limit: number = 100): string[] {
  if (existsSync(LOG_FILE)) {
    const logs = readFileSync(LOG_FILE, 'utf-8').split('\n');
    return logs.slice(-limit).filter(Boolean); // Return last 'limit' lines, filtering empty ones
  }
  return ["No logs available."];
}


// Start Tiny HTTP API Server
async function startApiServer() {
  const app = express();
  app.use(express.json()); // For parsing application/json

  // Middleware for CORS (if needed, but for localhost-only, not strictly necessary)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Allow any origin for local app
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.post("/api/start", async (req, res) => {
    try {
      await startGateway();
      res.json({ status: "success", message: "Moltbot Gateway started." });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/stop", (req, res) => {
    try {
      stopGateway();
      res.json({ status: "success", message: "Moltbot Gateway stopped." });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/chat", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(getChatLogs(limit));
  });

  app.get("/api/status", (req, res) => {
    res.json(getGatewayStatus());
  });

  app.listen(API_SERVER_PORT, "127.0.0.1", () => {
    console.log(`Android API server listening on 127.0.0.1:${API_SERVER_PORT}`);
  });
}

// Launch TTYD
async function startTtyd() {
  // Check if ttyd is installed
  if (spawnSync("command", ["-v", "ttyd"], { stdio: "ignore" }).status !== 0) {
    console.warn("ttyd is not installed. Please install it using 'pkg install ttyd -y'.");
    return;
  }

  if (ttydProcess && !ttydProcess.killed) {
    console.log("ttyd is already running.");
    return;
  }

  const ttydCommand = "ttyd";
  const ttydArgs = ["-p", String(TTYD_PORT), "--port", String(TTYD_PORT), "-i", "127.0.0.1", "tail", "-f", LOG_FILE];

  ttydProcess = spawn(ttydCommand, ttydArgs, {
    detached: true,
    env: { ...process.env },
  });

  ttydProcess.unref();

  ttydProcess.on("error", (err) => {
    console.error(`ttyd process error: ${err.message}`);
    ttydProcess = null;
  });

  ttydProcess.on("exit", (code, signal) => {
    console.log(`ttyd process exited with code ${code}, signal ${signal}`);
    ttydProcess = null;
  });

  console.log(`ttyd started on 127.0.0.1:${TTYD_PORT} with PID: ${ttydProcess.pid}`);
}

// Main entry point for Android app
async function androidMain() {
  console.log("Moltbot starting in Android app mode...");

  // Start the API server first
  await startApiServer();

  // Optionally start gateway and ttyd on launch, or leave it to the API server.
  // The prompt suggests "start the main gateway using the standard command" when --android-app is passed,
  // so let's start it here.
  // Also launch ttyd
  await startGateway(); 
  await startTtyd();

  // Keep the main process alive (e.g., if API server is not detached)
  // Or, ensure graceful shutdown on SIGINT/SIGTERM
  process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down...');
    stopGateway();
    if (ttydProcess) {
      try {
        process.kill(-ttydProcess.pid!, 'SIGINT');
      } catch (error) {
        console.error(`Error stopping ttyd: ${error.message}`);
      }
      ttydProcess = null;
    }
    releaseWakeLock();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Shutting down...');
    stopGateway();
    if (ttydProcess) {
      try {
        process.kill(-ttydProcess.pid!, 'SIGTERM');
      } catch (error) {
        console.error(`Error stopping ttyd: ${error.message}`);
      }
      ttydProcess = null;
    }
    releaseWakeLock();
    process.exit(0);
  });
}

androidMain().catch((error) => {
  console.error("Android app failed to start:", error);
  process.exit(1);
});
