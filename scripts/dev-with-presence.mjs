import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const defaultVenvPython =
  process.platform === "win32"
    ? path.join(repoRoot, ".venv", "Scripts", "python.exe")
    : path.join(repoRoot, ".venv", "bin", "python");
const pythonBin = process.env.PYTHON_BIN || (fs.existsSync(defaultVenvPython) ? defaultVenvPython : "python");

let shuttingDown = false;
const children = new Set();

function log(message) {
  process.stdout.write(`[lockedin] ${message}\n`);
}

function spawnProcess(label, command, args) {
  log(`starting ${label}: ${command} ${args.join(" ")}`);

  const child = spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  children.add(child);
  child.on("exit", () => {
    children.delete(child);
  });

  return child;
}

function stopChild(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log("shutting down child processes");

  for (const child of children) {
    stopChild(child);
  }

  process.exit(exitCode);
}

const presenceService = spawnProcess("presence service", pythonBin, ["presence_service.py"]);
const nextDev = spawnProcess("next dev server", process.execPath, [nextBin, "dev"]);

presenceService.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  if (code === 0 || signal === "SIGTERM") {
    log("presence service stopped");
    shutdown(0);
    return;
  }

  log(`presence service exited unexpectedly with code ${code ?? "unknown"}`);
  shutdown(code ?? 1);
});

nextDev.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  if (signal === "SIGTERM") {
    shutdown(0);
    return;
  }

  log(`next dev server exited with code ${code ?? "unknown"}`);
  shutdown(code ?? 0);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
