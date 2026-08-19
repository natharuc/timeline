import { spawn } from "node:child_process";

const forwarded = process.argv.slice(2);
const args = [];

for (let index = 0; index < forwarded.length; index += 1) {
  const argument = forwarded[index];

  if (argument === "--host") {
    args.push("--hostname", forwarded[index + 1]);
    index += 1;
    continue;
  }

  if (argument !== "--strictPort") args.push(argument);
}

const next = spawn(process.execPath, ["./node_modules/next/dist/bin/next", "dev", ...args], { stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 1));
