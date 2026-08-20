import { apiGet, apiPost } from "../../shared/api/platform-api";
import type {
  Conversation,
  CreateConversationInput,
  Message,
  MessagingContact,
  SendMessageInput
} from "./messaging.types";

const path = "/messaging";

export function listConversations() {
  return apiGet<Conversation[]>(`${path}/conversations`);
}

export function listMessagingContacts(search = "") {
  const query = new URLSearchParams({ search: search.trim() });
  return apiGet<MessagingContact[]>(`${path}/contacts?${query}`);
}

export function getConversation(id: number) {
  return apiGet<Conversation>(`${path}/conversations/${id}`);
}

export function createConversation(input: CreateConversationInput) {
  return apiPost<Conversation>(`${path}/conversations`, input);
}

export function listMessages(conversationId: number, beforeSequence?: number) {
  const query = new URLSearchParams();
  query.set("limit", "200");
  if (beforeSequence !== undefined) query.set("beforeSequence", String(beforeSequence));
  return apiGet<Message[]>(`${path}/conversations/${conversationId}/messages?${query.toString()}`);
}

export function sendMessage(conversationId: number, input: SendMessageInput) {
  return apiPost<Message>(`${path}/conversations/${conversationId}/messages`, input);
}

export function markConversationRead(conversationId: number, messageId: number) {
  return apiPost<{ messageId: number }>(`${path}/conversations/${conversationId}/read`, { messageId });
}
