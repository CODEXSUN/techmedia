import { IonActionSheet, IonIcon, IonInput, IonModal } from "@ionic/react";
import { addOutline, arrowBackOutline, arrowRedoOutline, checkmarkCircleOutline, checkmarkDoneOutline, checkmarkOutline, closeOutline, copyOutline, documentOutline, ellipsisVerticalOutline, happyOutline, imageOutline, micOutline, paperPlaneOutline, pinOutline, searchOutline, starOutline, videocamOutline } from "ionicons/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessagingClient } from "../../../platform/web/src/modules/messaging/messaging.client";
import { conversationTitle } from "../../../platform/web/src/modules/messaging/messaging.view";
import { createConversation, downloadMessagingAttachment, fetchMessagingAttachment, listConversations, listMessages, listMessagingContacts, markConversationRead, reactToMessage, sendMessage } from "../../../platform/web/src/modules/messaging/messaging.services";
import type { Conversation, Message, MessageType, MessagingContact } from "../../../platform/web/src/modules/messaging/messaging.types";

const MAX_INLINE_FILE_BYTES = 10 * 1024 * 1024;
const reactions = ["👍", "❤️", "😂", "😮", "🙏"];
type Attachment = { dataUrl: string; kind: MessageType; name: string; size: number; type: string };

export function MobileMessenger({ actorEmail, onThreadChange }: { actorEmail: string; onThreadChange: (value: boolean) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [contactQuery, setContactQuery] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastReadMessageRef = useRef<string | null>(null);
  const filteredConversations = useMemo(() => conversations.filter((conversation) => `${conversationTitle(conversation, actorEmail)} ${conversation.lastMessage?.content ?? ""}`.toLowerCase().includes(contactQuery.trim().toLowerCase())), [actorEmail, contactQuery, conversations]);

  async function refresh() { const items = await listConversations(); setConversations(items); return items; }
  useEffect(() => { void refresh().catch((cause) => setError(messageOf(cause))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!newChatOpen) return; void listMessagingContacts(contactQuery).then(setContacts).catch((cause) => setError(messageOf(cause))); }, [contactQuery, newChatOpen]);
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    void listMessages(active.id).then((items) => { if (mounted) setMessages(order(items)); }).catch((cause) => setError(messageOf(cause)));
    const client = new MessagingClient({
      onError: setError,
      onMessageCreated: (message, id) => { if (id === active.id) setMessages((items) => merge(items, [message])); void refresh().catch(() => undefined); },
      onMessageChanged: (message, id) => { if (id === active.id) setMessages((items) => merge(items, [message])); },
      onSyncCompleted: ({ conversationId, messages: incoming }) => { if (conversationId === active.id) setMessages((items) => merge(items, incoming)); }
    });
    client.subscribe(active.id); client.requestSync(active.id, 0);
    return () => { mounted = false; client.close(); };
  }, [active?.id]);
  useEffect(() => {
    const last = messages.at(-1);
    if (!active || !last || last.senderEmail === actorEmail) return;
    const readKey = `${active.id}:${last.id}`;
    if (lastReadMessageRef.current === readKey) return;
    lastReadMessageRef.current = readKey;
    void markConversationRead(active.id, last.id).then(() => void refresh()).catch((cause) => {
      lastReadMessageRef.current = null;
      setError(messageOf(cause));
    });
  }, [active, actorEmail, messages]);

  async function start(contact: MessagingContact) {
    try { const conversation = await createConversation({ memberIds: [contact.id], title: null, type: "DIRECT" }); await refresh(); setActive(conversation); onThreadChange(true); setNewChatOpen(false); }
    catch (cause) { setError(messageOf(cause)); }
  }
  async function startGroup(title: string, members: MessagingContact[]) {
    try {
      const conversation = await createConversation({ memberIds: members.map((member) => member.id), title, type: "GROUP" });
      await refresh(); setActive(conversation); onThreadChange(true); setNewChatOpen(false);
    } catch (cause) { setError(messageOf(cause)); }
  }
  async function send(content: string, type: MessageType, metadata: Record<string, unknown>, replyToMessageId?: number) {
    if (!active || !content.trim()) return false;
    try {
      const recipients = deliveryRecipients(active, metadata);
      const deliveryMetadata = recipients.length ? { ...metadata, deliveryRecipients: recipients } : metadata;
      const message = await sendMessage(active.id, { clientMessageId: crypto.randomUUID(), content: content.trim(), metadata: deliveryMetadata, ...(replyToMessageId ? { replyToMessageId } : {}), type });
      setMessages((items) => merge(items, [message]));
      await forwardMentions(active, content, type, deliveryMetadata);
      await refresh();
      return true;
    } catch (cause) { setError(messageOf(cause)); return false; }
  }

  if (active) return <Thread actorEmail={actorEmail} conversation={active} error={error} messages={messages} onBack={() => { setActive(undefined); onThreadChange(false); }} onError={setError} onMessagesChange={setMessages} onSend={send} />;
  return <section className="techme-messenger"><header className="techme-messenger-header"><div><p className="techme-eyebrow">MESSAGES</p><h1>Chats</h1></div><button aria-label="New chat" className="techme-icon-button" onClick={() => setNewChatOpen(true)} type="button"><IonIcon icon={addOutline} /></button></header><label className="techme-chat-search"><IonIcon icon={searchOutline} /><IonInput onIonInput={(event) => setContactQuery(event.detail.value ?? "")} placeholder="Search conversations" value={contactQuery} /></label>{error ? <p className="techme-error">{error}</p> : null}<div className="techme-chat-list">{loading ? <p className="techme-empty">Loading chats…</p> : null}{!loading && !conversations.length ? <p className="techme-empty">No chats yet. Start one with a Tech Media contact.</p> : null}{!loading && conversations.length && !filteredConversations.length ? <p className="techme-empty">No matching chats.</p> : null}{filteredConversations.map((conversation) => <button className="techme-chat-row" key={conversation.id} onClick={() => { setActive(conversation); onThreadChange(true); }} type="button"><Avatar name={conversationTitle(conversation, actorEmail)} /><span className="techme-chat-copy"><strong>{conversationTitle(conversation, actorEmail)}</strong><small>{conversation.lastMessage?.content || "Start a conversation"}</small></span><span className="techme-chat-meta"><time>{formatTime(conversation.updatedAt)}</time>{conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}</span></button>)}</div><ContactPicker contacts={contacts} onClose={() => setNewChatOpen(false)} onCreateGroup={startGroup} onSearch={setContactQuery} onSelect={start} open={newChatOpen} /></section>;
}

function Thread({ actorEmail, conversation, error, messages, onBack, onError, onMessagesChange, onSend }: { actorEmail: string; conversation: Conversation; error: string; messages: Message[]; onBack: () => void; onError: (message: string) => void; onMessagesChange: (update: (messages: Message[]) => Message[]) => void; onSend: (content: string, type: MessageType, metadata: Record<string, unknown>, replyToMessageId?: number) => Promise<boolean> }) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<Message>();
  const [reply, setReply] = useState<Message>();
  const [pinned, setPinned] = useState<number[]>([]);
  const [starred, setStarred] = useState<number[]>([]);
  const [selected, setSelected] = useState<number>();
  const [messageSearch, setMessageSearch] = useState("");
  const title = conversationTitle(conversation, actorEmail);
  const visibleMessages = useMemo(() => messages.filter((message) => `${message.senderName} ${message.content}`.toLowerCase().includes(messageSearch.trim().toLowerCase())), [messageSearch, messages]);
  const toggle = (values: number[], id: number) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
  const actions = actionMessage ? [
    ...reactions.map((reaction) => ({ text: reaction, handler: () => { void reactToMessage(conversation.id, actionMessage.id, reaction).then((updated) => onMessagesChange((items) => merge(items, [updated]))).catch((cause) => onError(messageOf(cause))); } })),
    { text: "Reply", icon: arrowRedoOutline, handler: () => setReply(actionMessage) },
    { text: "Copy", icon: copyOutline, handler: () => void navigator.clipboard?.writeText(actionMessage.content) },
    { text: "Forward", icon: arrowRedoOutline, handler: () => void shareMessage(actionMessage.content) },
    { text: pinned.includes(actionMessage.id) ? "Unpin" : "Pin", icon: pinOutline, handler: () => setPinned((ids) => toggle(ids, actionMessage.id)) },
    { text: starred.includes(actionMessage.id) ? "Unstar" : "Star", icon: starOutline, handler: () => setStarred((ids) => toggle(ids, actionMessage.id)) },
    { text: selected === actionMessage.id ? "Clear selection" : "Select", icon: checkmarkCircleOutline, handler: () => setSelected((id) => id === actionMessage.id ? undefined : actionMessage.id) },
    { text: "Cancel", role: "cancel" }
  ] : [];
  return <section className="techme-thread"><header className="techme-thread-header"><button aria-label="Back to chats" className="techme-icon-button" onClick={onBack} type="button"><IonIcon icon={arrowBackOutline} /></button><Avatar name={title} /><div className="techme-thread-identity"><strong>{title}</strong><small>Online</small></div><div className="techme-thread-actions"><button aria-expanded={Boolean(messageSearch)} aria-label="Search messages" className="techme-toolbar-button" onClick={() => setMessageSearch((value) => value ? "" : " ")} type="button"><IonIcon icon={searchOutline} /></button><button aria-expanded={optionsOpen} aria-label="Conversation options" className="techme-toolbar-button" onClick={() => setOptionsOpen((open) => !open)} type="button"><IonIcon icon={ellipsisVerticalOutline} /></button></div>{optionsOpen ? <nav className="techme-thread-menu"><button type="button">Contact info</button><button type="button">Shared media</button><button type="button">Mute notifications</button></nav> : null}</header>{messageSearch ? <label className="techme-thread-search"><IonIcon icon={searchOutline} /><IonInput autofocus onIonInput={(event) => setMessageSearch(event.detail.value ?? "")} placeholder="Search messages" value={messageSearch.trim()} /></label> : null}{error ? <p className="techme-error techme-thread-error">{error}</p> : null}<div className="techme-message-scroll">{messages.length && !visibleMessages.length ? <p className="techme-thread-empty">No matching messages.</p> : null}{visibleMessages.map((message) => <MessageBubble key={message.id} message={message} mine={message.senderEmail === actorEmail} onLongPress={setActionMessage} pinned={pinned.includes(message.id)} reaction={[...new Set(message.reactions.map((item) => item.emoji))].join(" ") || undefined} selected={selected === message.id} starred={starred.includes(message.id)} />)}{!messages.length ? <p className="techme-thread-empty">No messages yet. Send the first one.</p> : null}</div><MessageComposer onCancelReply={() => setReply(undefined)} onSend={onSend} reply={reply} /><IonActionSheet buttons={actions} isOpen={Boolean(actionMessage)} onDidDismiss={() => setActionMessage(undefined)} /></section>;
}

function MessageComposer({ onCancelReply, onSend, reply }: { onCancelReply: () => void; onSend: (content: string, type: MessageType, metadata: Record<string, unknown>, replyToMessageId?: number) => Promise<boolean>; reply?: Message | undefined }) {
  const [attachment, setAttachment] = useState<Attachment>();
  const [attachmentMenu, setAttachmentMenu] = useState(false);
  const [draft, setDraft] = useState("");
  const [mentionContacts, setMentionContacts] = useState<MessagingContact[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null); const imageRef = useRef<HTMLInputElement>(null); const videoRef = useRef<HTMLInputElement>(null);
  const mention = mentionQuery(draft);
  useEffect(() => { if (mention === null) { setMentionContacts([]); return; } void listMessagingContacts(mention).then(setMentionContacts).catch((cause) => setError(messageOf(cause))); }, [mention]);
  async function pick(file?: File) { if (!file) return; if (file.size > MAX_INLINE_FILE_BYTES) { setError("Attachments must be 10 MB or smaller."); return; } setAttachment({ dataUrl: await readDataUrl(file), kind: attachmentType(file.type), name: file.name, size: file.size, type: file.type || "application/octet-stream" }); setAttachmentMenu(false); setError(""); }
  async function submit() { const text = draft.trim() || attachment?.name; if (!text) return; const mentioned = mentionContacts.filter((contact) => text.toLowerCase().includes(`@${contact.name.toLowerCase()}`)); const task = text.startsWith("/task "); const metadata: Record<string, unknown> = { mentionNames: mentioned.map((contact) => contact.name), mentions: mentioned.map((contact) => contact.id) }; if (attachment) metadata.attachment = attachment; if (task) metadata.command = "task"; if (await onSend(task ? text.slice(6).trim() : text, task ? "TASK" : attachment?.kind ?? "TEXT", metadata, reply?.id)) { setAttachment(undefined); setDraft(""); setMentionContacts([]); onCancelReply(); } }
  return <footer className="techme-composer">{attachmentMenu ? <div className="techme-attachment-menu"><button onClick={() => imageRef.current?.click()} type="button"><IonIcon icon={imageOutline} />Image</button><button onClick={() => videoRef.current?.click()} type="button"><IonIcon icon={videocamOutline} />Video</button><button onClick={() => fileRef.current?.click()} type="button"><IonIcon icon={documentOutline} />File</button></div> : null}{mention !== null && mentionContacts.length ? <div className="techme-mention-menu">{mentionContacts.map((contact) => <button key={contact.id} onClick={() => setDraft((value) => insertMention(value, contact.name))} type="button"><Avatar name={contact.name} /><span><strong>{contact.name}</strong><small>{contact.email}</small></span></button>)}</div> : null}{reply ? <div className="techme-reply-preview"><span>Replying to {reply.senderName}</span><button aria-label="Cancel reply" onClick={onCancelReply} type="button"><IonIcon icon={closeOutline} /></button></div> : null}{attachment ? <div className="techme-attachment-preview"><IonIcon icon={attachment.kind === "IMAGE" ? imageOutline : attachment.kind === "VIDEO" ? videocamOutline : documentOutline} /><span>{attachment.name}</span><button aria-label="Remove attachment" onClick={() => setAttachment(undefined)} type="button"><IonIcon icon={closeOutline} /></button></div> : null}{emojiOpen ? <div className="techme-emoji-strip">{[...reactions, "😀", "🎉", "✅"].map((emoji) => <button key={emoji} onClick={() => { setDraft((value) => value + emoji); setEmojiOpen(false); }} type="button">{emoji}</button>)}</div> : null}<input accept="*/*" className="techme-file-input" onChange={(event) => void pick(event.target.files?.[0])} ref={fileRef} type="file" /><input accept="image/*" className="techme-file-input" onChange={(event) => void pick(event.target.files?.[0])} ref={imageRef} type="file" /><input accept="video/*" className="techme-file-input" onChange={(event) => void pick(event.target.files?.[0])} ref={videoRef} type="file" /><div className="techme-composer-shell"><button aria-label="Add attachment" className="techme-composer-icon" onClick={() => setAttachmentMenu((open) => !open)} type="button"><IonIcon icon={addOutline} /></button><button aria-label="Emoji" className="techme-composer-icon" onClick={() => setEmojiOpen((open) => !open)} type="button"><IonIcon icon={happyOutline} /></button><textarea onChange={(event) => { setDraft(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Type a message · @mention · /task" rows={1} value={draft} />{draft.trim() || attachment ? null : <button aria-label="Voice message" className="techme-composer-icon" type="button"><IonIcon icon={micOutline} /></button>}</div>{draft.trim() || attachment ? <button aria-label="Send" className="techme-send" onClick={() => void submit()} type="button"><IonIcon icon={paperPlaneOutline} /></button> : null}{error ? <p className="techme-composer-error">{error}</p> : null}</footer>;
}

function MessageBubble({ message, mine, onLongPress, pinned, reaction, selected, starred }: { message: Message; mine: boolean; onLongPress: (message: Message) => void; pinned: boolean; reaction?: string | undefined; selected: boolean; starred: boolean }) {
  const timer = useRef<number | undefined>(undefined); const clear = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = undefined; }; const hold = () => { clear(); timer.current = window.setTimeout(() => { onLongPress(message); timer.current = undefined; }, 3_000); };
  const attachment = attachmentFrom(message);
  return <article className={`techme-message ${mine ? "mine" : ""} ${selected ? "is-selected" : ""}`} onContextMenu={(event) => { event.preventDefault(); clear(); onLongPress(message); }} onTouchCancel={clear} onTouchEnd={clear} onTouchMove={clear} onTouchStart={hold}>{pinned || starred ? <span className="techme-message-flags">{pinned ? <IonIcon icon={pinOutline} /> : null}{starred ? <IonIcon icon={starOutline} /> : null}</span> : null}{message.replyToMessageId ? <span className="techme-reply-label">Reply</span> : null}{attachment ? <AttachmentView attachment={attachment} /> : null}{deliveryLabel(message) ? <span className="techme-delivery-label">Sent to {deliveryLabel(message)}</span> : null}<p>{message.content}</p><span className={`techme-message-meta ${message.status === "READ" ? "is-read" : ""}`}><time>{formatTime(message.createdAt)}</time>{mine ? <IonIcon icon={message.status === "READ" ? checkmarkDoneOutline : message.status === "DELIVERED" ? checkmarkDoneOutline : checkmarkOutline} /> : null}</span>{reaction ? <span className="techme-reaction">{reaction}</span> : null}</article>;
}

function ContactPicker({ contacts, onClose, onCreateGroup, onSearch, onSelect, open }: { contacts: MessagingContact[]; onClose: () => void; onCreateGroup: (title: string, members: MessagingContact[]) => void; onSearch: (value: string) => void; onSelect: (contact: MessagingContact) => void; open: boolean }) {
  const [groupMode, setGroupMode] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selected, setSelected] = useState<MessagingContact[]>([]);
  const toggle = (contact: MessagingContact) => setSelected((current) => current.some((item) => item.id === contact.id) ? current.filter((item) => item.id !== contact.id) : [...current, contact]);
  const close = () => { setGroupMode(false); setGroupTitle(""); setSelected([]); onClose(); };
  return <IonModal breakpoints={[0, .72]} initialBreakpoint={.72} isOpen={open} onDidDismiss={close}><section className="techme-contact-picker"><header><div><p className="techme-eyebrow">{groupMode ? "NEW GROUP" : "NEW CHAT"}</p><h2>{groupMode ? "Add people" : "Choose a contact"}</h2></div><div><button aria-label={groupMode ? "Start a direct chat" : "Create group"} className="techme-icon-button" onClick={() => setGroupMode((value) => !value)} type="button"><IonIcon icon={groupMode ? arrowBackOutline : addOutline} /></button><button aria-label="Close" className="techme-icon-button" onClick={close} type="button"><IonIcon icon={closeOutline} /></button></div></header>{groupMode ? <IonInput className="techme-group-title" fill="outline" onIonInput={(event) => setGroupTitle(event.detail.value ?? "")} placeholder="Group name" value={groupTitle} /> : null}{selected.length ? <p className="techme-group-selection">{selected.map((contact) => contact.name).join(", ")}</p> : null}<label className="techme-chat-search"><IonIcon icon={searchOutline} /><IonInput autofocus onIonInput={(event) => onSearch(event.detail.value ?? "")} placeholder="Search people" /></label>{contacts.map((contact) => <button aria-pressed={groupMode && selected.some((item) => item.id === contact.id)} className="techme-contact-row" key={contact.id} onClick={() => groupMode ? toggle(contact) : onSelect(contact)} type="button"><Avatar name={contact.name} /><span><strong>{contact.name}</strong><small>{contact.email}</small></span>{groupMode && selected.some((item) => item.id === contact.id) ? <IonIcon className="techme-contact-check" icon={checkmarkCircleOutline} /> : null}</button>)}{groupMode ? <button className="techme-create-group" disabled={!groupTitle.trim() || selected.length < 2} onClick={() => onCreateGroup(groupTitle.trim(), selected)} type="button">Create group</button> : null}</section></IonModal>;
}
function Avatar({ name }: { name: string }) { return <span className="techme-avatar">{name.split(/\s+/u).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>; }
function AttachmentView({ attachment }: { attachment: Attachment }) {
  const [open, setOpen] = useState(false);
  const source = useAttachmentSource(attachment.dataUrl);
  if (!source) return <span className="techme-message-file"><IonIcon icon={documentOutline} />Loading {attachment.name}</span>;
  if (attachment.kind === "IMAGE") return <img alt={attachment.name} className="techme-message-image" src={source} />;
  if (attachment.kind === "VIDEO") return <video className="techme-message-video" controls src={source} />;
  if (!isPdf(attachment)) return <button className="techme-message-file" onClick={() => void downloadMessagingAttachment(attachment.dataUrl, attachment.name)} type="button"><IonIcon icon={documentOutline} />{attachment.name}</button>;
  return <>
    <section aria-label={`${attachment.name} document`} className="techme-pdf-card">
      <button aria-label={`View ${attachment.name}`} className="techme-pdf-preview" onClick={() => setOpen(true)} type="button">
        <span className="techme-pdf-badge">PDF</span>
        <span className="techme-pdf-copy"><strong>{attachment.name}</strong><small>{formatAttachmentMeta(attachment)}</small></span>
      </button>
      <footer>
        <button onClick={() => setOpen(true)} type="button">View</button>
        <button onClick={() => void downloadMessagingAttachment(attachment.dataUrl, attachment.name)} type="button">Save as…</button>
      </footer>
    </section>
    <IonModal className="techme-pdf-modal" isOpen={open} onDidDismiss={() => setOpen(false)}>
      <section className="techme-pdf-viewer">
        <header><div><strong>{attachment.name}</strong><small>{formatAttachmentMeta(attachment)}</small></div><button aria-label="Close document" className="techme-icon-button" onClick={() => setOpen(false)} type="button"><IonIcon icon={closeOutline} /></button></header>
        <iframe src={source} title={attachment.name} />
        <footer><button onClick={() => void downloadMessagingAttachment(attachment.dataUrl, attachment.name)} type="button">Save as…</button></footer>
      </section>
    </IonModal>
  </>;
}
function useAttachmentSource(path: string) { const [source, setSource] = useState<string>(); useEffect(() => { let current = true; let objectUrl: string | undefined; void fetchMessagingAttachment(path).then((url) => { objectUrl = url; if (current) setSource(url); else URL.revokeObjectURL(url); }).catch(() => current && setSource(undefined)); return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [path]); return source; }
async function forwardMentions(conversation: Conversation, content: string, type: MessageType, metadata: Record<string, unknown>) { const ids = Array.isArray(metadata.mentions) ? metadata.mentions.filter((value): value is number => Number.isInteger(value) && value > 0) : []; const direct = new Set(conversation.type === "DIRECT" ? conversation.members.map((member) => member.userId) : []); await Promise.allSettled([...new Set(ids)].filter((id) => !direct.has(id)).map(async (id) => { const chat = await createConversation({ memberIds: [id], title: null, type: "DIRECT" }); await sendMessage(chat.id, { clientMessageId: crypto.randomUUID(), content, metadata: { ...metadata, mentionForwardedFromConversationId: conversation.id }, type }); })); }
function deliveryRecipients(conversation: Conversation, metadata: Record<string, unknown>) { if (conversation.type !== "DIRECT") return []; const mentions = Array.isArray(metadata.mentionNames) ? metadata.mentionNames.filter((value): value is string => typeof value === "string") : []; return mentions.length ? [...new Set([...conversation.members.map((member) => member.userName), ...mentions])] : []; }
function deliveryLabel(message: Message) { const recipients = message.metadata.deliveryRecipients; return Array.isArray(recipients) ? recipients.filter((value): value is string => typeof value === "string").join(", ") : ""; }
function attachmentType(type: string): MessageType { return type.startsWith("image/") ? "IMAGE" : type.startsWith("video/") ? "VIDEO" : "FILE"; }
function attachmentFrom(message: Message): Attachment | undefined { const value = message.metadata.attachment; if (!value || typeof value !== "object") return undefined; const item = value as Record<string, unknown>; const url = typeof item.url === "string" ? item.url : item.dataUrl; const type = typeof item.contentType === "string" ? item.contentType : typeof item.type === "string" ? item.type : "application/octet-stream"; return typeof url === "string" && typeof item.name === "string" ? { dataUrl: url, kind: attachmentType(type), name: item.name, size: typeof item.size === "number" ? item.size : 0, type } : undefined; }
function isPdf(attachment: Attachment) { return attachment.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf"); }
function formatAttachmentMeta(attachment: Attachment) { return `${formatBytes(attachment.size)} · PDF`; }
function formatBytes(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`; return `${(size / (1024 * 1024)).toFixed(1)} MB`; }
function mentionQuery(value: string) { const match = value.match(/(?:^|\s)@([^\s@]*)$/u); return match ? match[1] ?? "" : null; }
function insertMention(value: string, name: string) { return value.replace(/@[^\s@]*$/u, `@${name} `); }
function readDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
async function shareMessage(content: string) { if (navigator.share) await navigator.share({ text: content }); else await navigator.clipboard?.writeText(content); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }); }
function merge(current: Message[], incoming: Message[]) { return order([...new Map([...current, ...incoming].map((item) => [item.id, item])).values()]); }
function order(items: Message[]) { return [...items].sort((left, right) => left.sequenceNumber - right.sequenceNumber); }
function messageOf(cause: unknown) { return cause instanceof Error ? cause.message : "Messaging is unavailable. Please try again."; }
