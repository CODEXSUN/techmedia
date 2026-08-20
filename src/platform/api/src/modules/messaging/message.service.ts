import { AppError } from "@codexsun/framework/errors";
import { recordAuditEvent } from "../../database/audit.js";
import { toMessageDto } from "./messaging.mapper.js";
import type { MessageDto, MessagingContext } from "./messaging.types.js";
import type { MessagingRepository, MessageRow } from "./messaging.repositories.js";
import type { MessageStatus, MessageType } from "../../database/schema.js";

export type SendMessageInput = {
  clientMessageId: string | null;
  content: string;
  forwardedFromMessageId?: number | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  replyToMessageId?: number | null | undefined;
  threadId?: number | null | undefined;
  type: MessageType;
};

export class MessageService {
  constructor(
    private readonly context: MessagingContext,
    private readonly repository: MessagingRepository
  ) {}

  /** Persists a message idempotently by client_message_id. The database write
   * completes before the message is considered sent. */
  async send(conversationId: number, input: SendMessageInput): Promise<MessageDto> {
    const actor = await this.requireActor();
    const conversation = await this.repository.findConversationByMember(conversationId, actor.id);
    if (!conversation) throw AppError.notFound("Conversation was not found.");
    if (input.clientMessageId) {
      const existing = await this.repository.findMessageByClientId(
        conversationId,
        input.clientMessageId
      );
      if (existing) return toMessageDto(existing, await this.sender(existing.sender_id));
    }
    const row = await this.repository.saveMessage({
      client_message_id: input.clientMessageId,
      content: input.content,
      conversation_id: conversationId,
      forwarded_from_message_id: input.forwardedFromMessageId ?? null,
      metadata: input.metadata ?? {},
      reply_to_message_id: input.replyToMessageId ?? null,
      sender_id: actor.id,
      thread_id: input.threadId ?? null,
      type: input.type
    });
    await recordAuditEvent({
      action: "message.created",
      actorEmail: actor.email,
      moduleKey: "messaging",
      recordId: row.id,
      recordLabel: `conversation:${conversationId}`,
      recordUuid: row.uuid
    });
    return toMessageDto(row, await this.sender(row.sender_id));
  }

  async list(
    conversationId: number,
    options: { beforeSequence?: number; limit: number }
  ): Promise<MessageDto[]> {
    const actor = await this.requireActor();
    const conversation = await this.repository.findConversationByMember(conversationId, actor.id);
    if (!conversation) throw AppError.notFound("Conversation was not found.");
    const rows = await this.repository.listMessages(conversationId, options);
    return this.withSenders(rows);
  }

  /** Offline synchronization: return messages after the last known sequence. */
  async afterSequence(
    conversationId: number,
    afterSequence: number,
    limit: number
  ): Promise<MessageDto[]> {
    const actor = await this.requireActor();
    const conversation = await this.repository.findConversationByMember(conversationId, actor.id);
    if (!conversation) throw AppError.notFound("Conversation was not found.");
    const rows = await this.repository.messagesAfterSequence(conversationId, afterSequence, limit);
    return this.withSenders(rows);
  }

  /** Advances delivery/read state for a single message in a conversation. */
  async setStatus(
    conversationId: number,
    messageId: number,
    status: MessageStatus
  ): Promise<number> {
    const actor = await this.requireActor();
    const conversation = await this.repository.findConversationByMember(conversationId, actor.id);
    if (!conversation) throw AppError.notFound("Conversation was not found.");
    const message = await this.repository.findMessageById(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw AppError.notFound("Message was not found.");
    }
    await this.repository.setMessageStatus(messageId, status);
    return message.sequence_number;
  }

  async markRead(conversationId: number, messageId: number): Promise<void> {
    const actor = await this.requireActor();
    const member = await this.repository.findMember(conversationId, actor.id);
    if (!member) throw AppError.notFound("Conversation was not found.");
    const message = await this.repository.findMessageById(messageId);
    if (!message || message.conversation_id !== conversationId) throw AppError.notFound("Message was not found.");
    const previous = member.last_read_message_id ? await this.repository.findMessageById(member.last_read_message_id) : undefined;
    if (!previous || previous.sequence_number < message.sequence_number) {
      await this.repository.markConversationRead(conversationId, actor.id, messageId);
    }
  }

  private async withSenders(rows: MessageRow[]): Promise<MessageDto[]> {
    const senderIds = [...new Set(rows.map((row) => row.sender_id))];
    const users = await this.repository.findUsersByIds(senderIds);
    const byId = new Map(users.map((user) => [user.id, user]));
    return rows.map((row) => toMessageDto(row, byId.get(row.sender_id)));
  }

  private async sender(userId: number) {
    const [user] = await this.repository.findUsersByIds([userId]);
    return user;
  }

  private async requireActor() {
    const actor = await this.context.actorUser();
    if (!actor) throw AppError.unauthorized("An active user is required.");
    return actor;
  }
}
