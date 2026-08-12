import { env } from "../../env.js";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";

type Message = { content: string; role: "assistant" | "system" | "user" };

export class HoneyModelGateway {
  async complete(messages: Message[]) {
    if (!env.AI_API_KEY) return completeWithCodex(messages);
    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/u, "")}/chat/completions`, {
      body: JSON.stringify({ messages, model: env.AI_MODEL, temperature: 0.35 }),
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
        ...providerHeaders()
      },
      method: "POST",
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS)
    });
    if (!response.ok)
      throw new Error(
        `Honey provider returned ${response.status}: ${(await response.text()).slice(0, 300)}`
      );
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Honey provider returned an empty response.");
    return content;
  }
}

async function completeWithCodex(messages: Message[]) {
  const script = createRequire(import.meta.url).resolve("@openai/codex/bin/codex.js");
  const prompt = messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
  const stdout = await runCodex(script, prompt);
  const content = stdout.trim();
  if (!content) throw new Error("Connected Codex account returned an empty response.");
  return content;
}

function runCodex(script: string, prompt: string) {
  return new Promise<string>((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [
        script,
        "exec",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--color",
        "never",
        "-"
      ],
      { cwd: process.cwd(), maxBuffer: 2_000_000, timeout: env.AI_TIMEOUT_MS },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    );
    child.stdin?.end(prompt);
  });
}

function providerHeaders() {
  return env.AI_PROVIDER === "openrouter"
    ? { "HTTP-Referer": env.PLATFORM_WEB_ORIGIN, "X-Title": "TechMedia Honey" }
    : {};
}
