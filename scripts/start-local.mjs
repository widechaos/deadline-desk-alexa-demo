import { spawn } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
for (const file of ["models/Qwen3-4B-Q4_K_M.gguf", "models/ggml-base.en.bin"]) {
  try {
    await access(file);
  } catch {
    console.error(`Missing ${file}. Follow README model setup.`);
    process.exit(1);
  }
}
try {
  await access("models/local.key");
} catch {
  await writeFile("models/local.key", randomBytes(32).toString("hex"), {
    mode: 0o600,
  });
}
const children = [];
function launch(program, args) {
  const child = spawn(program, args, { stdio: "inherit" });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    shutdown();
  });
  return child;
}
function shutdown() {
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
launch("llama-server", [
  "-m",
  "models/Qwen3-4B-Q4_K_M.gguf",
  "--host",
  "127.0.0.1",
  "--port",
  "8096",
  "-c",
  "4096",
  "-ngl",
  "99",
  "--jinja",
  "--no-webui",
  "--cors-origins",
  "http://127.0.0.1:4176",
  "--api-key-file",
  "models/local.key",
]);
launch(process.execPath, ["server.mjs"]);
