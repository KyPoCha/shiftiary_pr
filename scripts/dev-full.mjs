import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();

async function main() {
  await runBlocking("db:migrate:local");

  const api = runLongLived("api:dev");
  const frontend = runLongLived("dev", ["--", "--host", "127.0.0.1"]);

  api.on("exit", (code) => shutdown(frontend, code));
  frontend.on("exit", (code) => shutdown(api, code));
}

function runBlocking(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ["run", scriptName], {
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? "unknown"}`));
    });
  });
}

function runLongLived(scriptName, extraArgs = []) {
  const child = spawn(npmCommand, ["run", scriptName, ...extraArgs], {
    stdio: "inherit",
  });

  children.add(child);
  child.on("exit", () => children.delete(child));
  return child;
}

function shutdown(otherProcess, code) {
  if (otherProcess.exitCode === null) {
    otherProcess.kill("SIGTERM");
  }

  for (const child of children) {
    child.kill("SIGTERM");
  }

  process.exit(code ?? 0);
}

process.on("SIGINT", () => {
  for (const child of children) {
    child.kill("SIGINT");
  }

  process.exit(0);
});

process.on("SIGTERM", () => {
  for (const child of children) {
    child.kill("SIGTERM");
  }

  process.exit(0);
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
