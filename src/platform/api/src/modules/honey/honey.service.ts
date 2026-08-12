import { randomUUID } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { ReturnTypeIdentityContext } from "./honey.types.js";
import { HoneyModelGateway } from "./honey.gateway.js";

export class HoneyService {
  constructor(
    private readonly context: ReturnTypeIdentityContext,
    private readonly gateway = new HoneyModelGateway()
  ) {}

  async list() {
    const actor = await this.actor();
    return this.context.database
      .selectFrom("ai_honey_threads")
      .select(["uuid as id", "title", "updated_at as updatedAt"])
      .where("actor_user_id", "=", actor.id)
      .where("archived_at", "is", null)
      .orderBy("updated_at", "desc")
      .execute();
  }

  async archive(id: string) {
    const actor = await this.actor();
    await this.requireThread(id, actor.id);
    await this.context.database
      .updateTable("ai_honey_threads")
      .set({ archived_at: new Date() })
      .where("uuid", "=", id)
      .where("actor_user_id", "=", actor.id)
      .execute();
    return { archived: true } as const;
  }

  async overview() {
    const actor = await this.actor();
    const [conversations, prompts, responses] = await Promise.all([
      this.context.database
        .selectFrom("ai_honey_threads")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .where("actor_user_id", "=", actor.id)
        .executeTakeFirstOrThrow(),
      this.context.database
        .selectFrom("ai_honey_messages")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .where("actor_user_id", "=", actor.id)
        .where("role", "=", "user")
        .executeTakeFirstOrThrow(),
      this.context.database
        .selectFrom("ai_honey_messages")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .where("actor_user_id", "=", actor.id)
        .where("role", "=", "assistant")
        .executeTakeFirstOrThrow()
    ]);
    return {
      conversationCount: Number(conversations.count),
      promptCount: Number(prompts.count),
      responseCount: Number(responses.count)
    };
  }

  async conversation(id: string) {
    const actor = await this.actor();
    await this.requireThread(id, actor.id);
    const messages = await this.context.database
      .selectFrom("ai_honey_messages")
      .select([
        "uuid as id",
        "role",
        "body",
        "metadata_json as metadata",
        "created_at as createdAt"
      ])
      .where("thread_uuid", "=", id)
      .where("actor_user_id", "=", actor.id)
      .orderBy("created_at")
      .execute();
    return {
      id,
      messages: messages.map((message) => ({
        ...message,
        metadata: JSON.parse(message.metadata) as unknown
      }))
    };
  }

  async chat(input: {
    message: string;
    mode: "assistant" | "content-writer";
    threadId?: string | null | undefined;
  }) {
    const actor = await this.actor();
    const threadId = input.threadId ?? (await this.createThread(actor.id, input.message));
    await this.requireThread(threadId, actor.id);
    await this.addMessage(threadId, actor.id, "user", input.message, { mode: input.mode });
    const history = await this.context.database
      .selectFrom("ai_honey_messages")
      .select(["role", "body"])
      .where("thread_uuid", "=", threadId)
      .orderBy("created_at", "desc")
      .limit(12)
      .execute();
    const result =
      input.mode === "content-writer"
        ? await this.runContentWorkers(input.message)
        : {
            body: await this.gateway.complete([
              { role: "system", content: await this.systemPrompt() },
              ...history
                .reverse()
                .map((row) => ({ role: row.role as "assistant" | "user", content: row.body }))
            ]),
            workers: []
          };
    await this.addMessage(threadId, actor.id, "assistant", result.body, {
      mode: input.mode,
      workers: result.workers
    });
    return this.conversation(threadId);
  }

  private async runContentWorkers(brief: string) {
    const planner = await this.gateway.complete([
      {
        role: "system",
        content:
          "You are a content strategist sub-agent. Produce a factual outline, audience, intent, and claims that need verification. Do not invent facts."
      },
      { role: "user", content: brief }
    ]);
    const draft = await this.gateway.complete([
      {
        role: "system",
        content:
          "You are a TechMedia content writer. Write useful, clear copy from the approved brief and outline. Mark facts that require verification."
      },
      { role: "user", content: `Brief:\n${brief}\n\nStrategist outline:\n${planner}` }
    ]);
    const body = await this.gateway.complete([
      {
        role: "system",
        content:
          "You are a senior editor sub-agent. Return polished publish-ready content. Preserve uncertainty labels and do not add unsupported claims."
      },
      { role: "user", content: draft }
    ]);
    return {
      body,
      workers: [
        { name: "strategist", output: planner },
        { name: "writer", output: draft },
        { name: "editor", output: body }
      ]
    };
  }

  private async systemPrompt() {
    const skills = await this.context.database
      .selectFrom("ai_honey_skills")
      .select(["name", "instructions"])
      .where("enabled", "=", 1)
      .execute();
    return `${assistantPrompt}\n\nEnabled business skills:\n${skills.map((skill) => `- ${skill.name}: ${skill.instructions}`).join("\n")}`;
  }

  private async actor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("An active user is required.");
    return actor;
  }
  private async createThread(actorId: number, title: string) {
    const uuid = randomUUID();
    await this.context.database
      .insertInto("ai_honey_threads")
      .values({ actor_user_id: actorId, title: title.slice(0, 240), uuid })
      .execute();
    return uuid;
  }
  private async requireThread(uuid: string, actorId: number) {
    const thread = await this.context.database
      .selectFrom("ai_honey_threads")
      .select("uuid")
      .where("uuid", "=", uuid)
      .where("actor_user_id", "=", actorId)
      .where("archived_at", "is", null)
      .executeTakeFirst();
    if (!thread) throw AppError.notFound("TEMA conversation was not found.");
  }
  private async addMessage(
    threadUuid: string,
    actorId: number,
    role: "assistant" | "user",
    body: string,
    metadata: unknown
  ) {
    await this.context.database
      .insertInto("ai_honey_messages")
      .values({
        actor_user_id: actorId,
        body,
        metadata_json: JSON.stringify(metadata),
        role,
        thread_uuid: threadUuid,
        uuid: randomUUID()
      })
      .execute();
  }
}

const assistantPrompt =
  "You are TEMA, TechMedia's AI assistant and computer-helping mascot. Help with CRM communication, estimates, quotations, content planning, and concise business work. Never claim that you changed Frappe or sent a message. Never expose secrets. Ask for confirmation before suggesting external side effects.";
