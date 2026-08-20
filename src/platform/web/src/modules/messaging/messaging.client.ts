import { requiredClientEnv } from "../../shared/env/client-env";
import { getToken } from "../../shared/api/platform-api";
import type { Message } from "./messaging.types";

export type RealtimeEventHandler = {
  onError?: (error: string) => void;
  onMessageCreated?: (message: Message, conversationId: number) => void;
  onStatusChange?: (status: "connecting" | "open" | "closed") => void;
  onSyncCompleted?: (payload: { conversationId: number; latestSequence: number; messages: Message[] }) => void;
};

function websocketUrl(): string {
  const apiBaseUrl = requiredClientEnv("VITE_PLATFORM_API_URL").replace(/\/$/u, "");
  if (/^https?:\/\//u.test(apiBaseUrl)) {
    const url = new URL(apiBaseUrl);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}${url.pathname}/ws/messaging`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${apiBaseUrl}/ws/messaging`;
}

let eventId = 0;
function frame(eventType: string, payload: Record<string, unknown>) {
  eventId += 1;
  return JSON.stringify({ eventId: String(eventId), eventType, payload });
}

export class MessagingClient {
  private readonly handlers: RealtimeEventHandler;
  private socket: WebSocket | null = null;
  private readonly subscribed = new Set<number>();
  private authenticated = false;
  private open = false;
  private closedByClient = false;
  private reconnectTimer: number | null = null;
  private readonly authenticatedQueue: Array<() => void> = [];

  get isOpen(): boolean {
    return this.open && this.authenticated;
  }

  constructor(handlers: RealtimeEventHandler = {}) {
    this.handlers = handlers;
    this.connect();
  }

  private connect() {
    this.handlers.onStatusChange?.("connecting");
    const socket = new WebSocket(websocketUrl());
    this.socket = socket;
    socket.onopen = () => {
      this.open = true;
      this.authenticate();
    };
    socket.onclose = () => {
      this.open = false;
      this.authenticated = false;
      this.handlers.onStatusChange?.("closed");
      if (!this.closedByClient) this.reconnectTimer = window.setTimeout(() => this.connect(), 2_000);
    };
    socket.onerror = () => {
      this.open = false;
      this.handlers.onError?.("The messaging connection could not be established.");
    };
    socket.onmessage = (event) => this.receive(String(event.data));
  }

  private authenticate() {
    const token = getToken();
    if (!token) return;
    this.socket?.send(frame("auth", { token }));
  }

  private receive(raw: string) {
    let envelope: { eventType: string; payload: Record<string, unknown> };
    try {
      envelope = JSON.parse(raw) as typeof envelope;
    } catch {
      return;
    }
    if (envelope.eventType === "auth.success") {
      this.authenticated = true;
      this.handlers.onStatusChange?.("open");
      this.authenticatedQueue.splice(0).forEach((run) => run());
      this.subscribed.forEach((conversationId) => this.send("conversation.subscribe", { conversationId }));
    }
    if (envelope.eventType === "message.created") {
      const payload = envelope.payload as { conversationId: number; message: Message };
      this.handlers.onMessageCreated?.(payload.message, payload.conversationId);
    }
    if (envelope.eventType === "sync.completed") {
      this.handlers.onSyncCompleted?.(
        envelope.payload as { conversationId: number; latestSequence: number; messages: Message[] }
      );
    }
    if (envelope.eventType === "error") {
      const payload = envelope.payload as { code?: string; message?: string };
      this.handlers.onError?.(payload.message ?? payload.code ?? "Messaging error.");
    }
  }

  private send(eventType: string, payload: Record<string, unknown>) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(frame(eventType, payload));
  }

  private afterAuthenticated(run: () => void) {
    if (this.authenticated) run();
    else this.authenticatedQueue.push(run);
  }

  subscribe(conversationId: number) {
    this.subscribed.add(conversationId);
    this.afterAuthenticated(() => this.send("conversation.subscribe", { conversationId }));
  }

  sendMessage(conversationId: number, clientMessageId: string, content: string, type = "TEXT", metadata: Record<string, unknown> = {}) {
    this.afterAuthenticated(() =>
      this.send("message.send", { clientMessageId, content, conversationId, metadata, type })
    );
  }

  requestSync(conversationId: number, afterSequence = 0) {
    this.afterAuthenticated(() =>
      this.send("sync.request", { conversationId, afterSequence, limit: 200 })
    );
  }

  close() {
    this.closedByClient = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
    }
  }
}
