import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CornerUpLeft,
  Ellipsis,
  ListChecks,
  MapPin,
  MessageSquare,
  Paperclip,
  Pencil,
  ReceiptText,
  Send,
  Smile,
  Square,
  Star,
  ScrollText,
  Timer,
  Trash2,
  X
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@codexsun/ui/components/alert-dialog";
import { Button } from "@codexsun/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@codexsun/ui/components/dropdown-menu";
import { Input } from "@codexsun/ui/components/input";
import { toast } from "@codexsun/ui/components/sonner";
import { Textarea } from "@codexsun/ui/components/textarea";
import { WorkspaceAnimatedTabs } from "@codexsun/ui/workspace/animated-tabs";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceMinimalEditor } from "@codexsun/ui/workspace/minimal-editor";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceDetailTable, WorkspaceShowCard } from "@codexsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTableEmptyState, WorkspaceTableHeaderCell } from "@codexsun/ui/workspace/table";
import { EstimateEnquiryTab } from "../estimate";
import { QuotationEnquiryTab } from "../quotation";
import { useCrmEnquiryChildMutations, useCrmEnquiryMutations, useCrmUsersQuery } from "./crm.hooks";
import type { CrmEnquiry, CrmEnquirySavePayload, CrmUserReference } from "./crm.types";

type CrmShowTab =
  "activity" | "attachments" | "comments" | "estimate" | "jobs" | "quotation" | "tasks";

export function CrmShow({
  canAssign,
  canCreateEstimate,
  canCreateQuotation,
  canUpdate,
  canUpdateEstimate,
  canUpdateQuotation,
  onBack,
  onNext,
  onRecordChange,
  record
}: {
  canAssign: boolean;
  canCreateEstimate: boolean;
  canCreateQuotation: boolean;
  canUpdate: boolean;
  canUpdateEstimate: boolean;
  canUpdateQuotation: boolean;
  onBack: () => void;
  onNext?: () => void;
  onRecordChange: (record: CrmEnquiry) => void;
  record: CrmEnquiry;
}) {
  const [activeTab, setActiveTab] = useState<CrmShowTab>("comments");
  const childMutations = useCrmEnquiryChildMutations(onRecordChange);
  const enquiryMutations = useCrmEnquiryMutations();
  const users = useCrmUsersQuery();
  async function saveChild(label: string, operation: () => Promise<CrmEnquiry>, action = "added") {
    try {
      await operation();
      toast.success(`${label} ${action}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} could not be ${action}.`);
      throw error;
    }
  }
  const jobLoading = childMutations.jobStart.isPending || childMutations.jobStop.isPending;
  const startJob = () =>
    saveChild("Job", () => childMutations.jobStart.mutateAsync(record.frappeName), "started");
  const stopJob = (jobName: string) =>
    saveChild(
      "Job",
      () => childMutations.jobStop.mutateAsync([record.frappeName, jobName]),
      "stopped"
    );
  async function updateProperties(
    patch: Partial<
      Pick<CrmEnquirySavePayload, "assignedToUserId" | "enquiryGroup" | "priority" | "status">
    >
  ) {
    try {
      const saved = await enquiryMutations.update.mutateAsync({
        id: record.frappeName,
        payload: enquiryPayload(record, patch)
      });
      onRecordChange(saved);
      toast.success("Enquiry properties updated", {
        description: "The change was saved to Frappe and added to the activity feed."
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The enquiry properties could not be updated."
      );
      throw error;
    }
  }
  const tabs = [
    {
      content: (
        <CommentsTab
          key={`comments-${record.id}`}
          loading={
            childMutations.message.isPending ||
            childMutations.messageDelete.isPending ||
            childMutations.messageUpdate.isPending
          }
          record={record}
          onAdd={(input) =>
            saveChild(input.messageType === "reply" ? "Reply" : "Comment", () =>
              childMutations.message.mutateAsync([record.frappeName, input])
            )
          }
          onDelete={(message) =>
            saveChild(
              message.messageType === "reply" ? "Reply" : "Comment",
              () => childMutations.messageDelete.mutateAsync([record.frappeName, message.id]),
              "deleted"
            )
          }
          onUpdate={(message, comment) =>
            saveChild(
              message.messageType === "reply" ? "Reply" : "Comment",
              () =>
                childMutations.messageUpdate.mutateAsync([
                  record.frappeName,
                  message.id,
                  { comment }
                ]),
              "updated"
            )
          }
          onOpenAttachments={() => setActiveTab("attachments")}
          onOpenCalendar={() => setActiveTab("tasks")}
        />
      ),
      label: (
        <TabLabel
          count={record.messages.length}
          icon={<MessageSquare className="size-4" />}
          label="Comments"
        />
      ),
      value: "comments"
    },
    {
      content: (
        <JobsTab
          key={`jobs-${record.id}`}
          loading={jobLoading}
          record={record}
          onStart={startJob}
          onStop={stopJob}
        />
      ),
      label: (
        <TabLabel count={record.jobs.length} icon={<Timer className="size-4" />} label="Jobs" />
      ),
      value: "jobs"
    },
    {
      content: (
        <EstimateEnquiryTab
          canCreate={canCreateEstimate}
          canUpdate={canUpdateEstimate}
          enquiry={record.frappeName}
        />
      ),
      label: <TabLabel icon={<ReceiptText className="size-4" />} label="Estimate" />,
      value: "estimate"
    },
    {
      content: (
        <QuotationEnquiryTab
          canCreate={canCreateQuotation}
          canUpdate={canUpdateQuotation}
          enquiry={record.frappeName}
        />
      ),
      label: <TabLabel icon={<ScrollText className="size-4" />} label="Quotation" />,
      value: "quotation"
    },
    {
      content: (
        <TasksTab
          key={`tasks-${record.id}`}
          loading={childMutations.task.isPending}
          record={record}
          onAdd={(input) =>
            saveChild("Task", () => childMutations.task.mutateAsync([record.frappeName, input]))
          }
        />
      ),
      label: <TabLabel icon={<ListChecks className="size-4" />} label="Tasks" />,
      value: "tasks"
    },
    {
      content: (
        <AttachmentsTab
          key={`attachments-${record.id}`}
          loading={childMutations.attachment.isPending}
          record={record}
          onAdd={(input) =>
            saveChild("Attachment", () =>
              childMutations.attachment.mutateAsync([record.frappeName, input])
            )
          }
        />
      ),
      label: <TabLabel icon={<Paperclip className="size-4" />} label="Attachments" />,
      value: "attachments"
    },
    {
      content: <ActivityTab key={`activity-${record.id}`} record={record} />,
      label: <TabLabel icon={<Activity className="size-4" />} label="Activity" />,
      value: "activity"
    }
  ];

  return (
    <WorkspacePage
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={onBack} type="button" variant="outline">
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button disabled={!onNext} onClick={onNext} type="button">
            Next
            <ArrowRight className="size-4" />
          </Button>
        </div>
      }
      className="!w-full !max-w-none px-1 lg:px-2"
      technicalName="page.crm.enquiry.show"
      title={`#${record.id} · ${record.mobile || "—"} · ${record.customer || enquiryDisplayTitle(record)}`}
    >
      <EnquirySummary record={record} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 overflow-hidden rounded-md border border-border/70 bg-card/95 shadow-sm">
          <WorkspaceAnimatedTabs
            contentClassName="mt-0 pb-0"
            listClassName="px-3"
            onValueChange={(value) => setActiveTab(value as CrmShowTab)}
            tabs={tabs}
            value={activeTab}
          />
        </div>

        <EnquiryProperties
          canAssign={canAssign}
          canUpdate={canUpdate}
          jobLoading={jobLoading}
          loading={enquiryMutations.update.isPending}
          record={record}
          users={users.data ?? []}
          onSave={updateProperties}
          onStartJob={startJob}
          onStopJob={stopJob}
        />
      </div>
    </WorkspacePage>
  );
}

function JobsTab({
  loading,
  onStart,
  onStop,
  record
}: {
  loading: boolean;
  onStart: () => Promise<unknown>;
  onStop: (jobName: string) => Promise<unknown>;
  record: CrmEnquiry;
}) {
  const running = record.jobs.filter((job) => job.status === "Running");
  const active = running[0];
  return (
    <section className="min-h-[calc(100dvh-21rem)] bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Live job time recorded directly against this enquiry in Frappe.
        </p>
        <JobControlButton
          active={active}
          loading={loading}
          runningCount={running.length}
          onStart={onStart}
          onStop={onStop}
        />
      </div>
      {running.length > 1 ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Frappe returned more than one running job. Stop the duplicate records in Frappe before
          continuing.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-md border border-border/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">Stop</th>
              <th className="px-3 py-2">Hours</th>
              <th className="px-3 py-2">Rate/hr</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {record.jobs.map((job) => (
              <tr className="border-t border-border/70" key={job.name}>
                <td className="px-3 py-2 font-medium">{job.name}</td>
                <td className="px-3 py-2">{job.employee}</td>
                <td className="px-3 py-2">{job.startTime || "—"}</td>
                <td className="px-3 py-2">{job.stopTime || "—"}</td>
                <td className="px-3 py-2">
                  {job.status === "Running" ? "Running" : job.hours.toFixed(2)}
                </td>
                <td className="px-3 py-2">₹{job.employeeCostPerHour.toFixed(2)}</td>
                <td className="px-3 py-2">{job.totalCost.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <WorkspaceStatusBadge
                    label={job.status}
                    tone={
                      job.status === "Completed"
                        ? "success"
                        : job.status === "Cancelled"
                          ? "neutral"
                          : "warning"
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {record.jobs.length === 0 ? (
          <WorkspaceTableEmptyState>No jobs have been recorded.</WorkspaceTableEmptyState>
        ) : null}
      </div>
    </section>
  );
}

function JobControlButton({
  active,
  fullWidth = false,
  loading,
  onStart,
  onStop,
  runningCount
}: {
  active: CrmEnquiry["jobs"][number] | undefined;
  fullWidth?: boolean;
  loading: boolean;
  onStart: () => Promise<unknown>;
  onStop: (jobName: string) => Promise<unknown>;
  runningCount: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) {
    return (
      <Button
        className={fullWidth ? "w-full" : undefined}
        disabled={loading}
        type="button"
        variant="secondary"
        onClick={() => void onStart()}
      >
        <Timer className="size-4" />
        Start job
      </Button>
    );
  }

  return (
    <Button
      className={`${fullWidth ? "w-full" : ""} bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white active:bg-emerald-700`}
      disabled={loading || runningCount > 1}
      type="button"
      onClick={() => void onStop(active.name)}
    >
      <Square className="size-3.5 fill-current" />
      Stop · {elapsedJobTime(active.createdAt, now)}
    </Button>
  );
}

function EnquirySummary({ record }: { record: CrmEnquiry }) {
  return (
    <section className="rounded-md border border-border/70 bg-card/95 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{record.id}</span>
            <h2 className="truncate text-lg font-semibold text-foreground">
              {enquiryDisplayTitle(record)}
            </h2>
          </div>
          <p className="mt-1 line-clamp-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            {plainText(record.workspace) || "No enquiry message has been recorded."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <WorkspaceStatusBadge
              className="h-7 px-3 text-xs"
              label={`List in · ${record.enquiryGroup || "Unlisted"}`}
              showIcon={false}
              tone="info"
            />
            <WorkspaceStatusBadge
              label={
                record.lifecycleStatus === "suspended" ? "Suspended" : capitalize(record.status)
              }
              tone={record.lifecycleStatus === "suspended" ? "danger" : statusTone(record.status)}
            />
            <WorkspaceStatusBadge label={capitalize(record.priority)} tone="neutral" />
          </div>
          <div className="space-y-0.5 text-xs leading-5 text-muted-foreground sm:text-right">
            <p>
              Created by{" "}
              <span className="font-medium text-foreground">{record.createdBy.name}</span>
            </p>
            <p>
              Created at{" "}
              <time className="font-medium text-foreground" dateTime={record.createdAt}>
                {formatDateTime(record.createdAt)}
              </time>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommentsTab({
  loading,
  onAdd,
  onDelete,
  onOpenAttachments,
  onOpenCalendar,
  onUpdate,
  record
}: {
  loading: boolean;
  onAdd: (input: { comment: string; messageType: "comment" | "reply" }) => Promise<unknown>;
  onDelete: (message: CrmEnquiry["messages"][number]) => Promise<unknown>;
  onOpenAttachments: () => void;
  onOpenCalendar: () => void;
  onUpdate: (message: CrmEnquiry["messages"][number], comment: string) => Promise<unknown>;
  record: CrmEnquiry;
}) {
  const [messageType, setMessageType] = useState<"comment" | "reply">("comment");
  const [comment, setComment] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(() => new Set());
  const [deletingMessage, setDeletingMessage] = useState<CrmEnquiry["messages"][number] | null>(
    null
  );
  const commentCount = record.messages.filter(
    (message) => message.messageType === "comment"
  ).length;
  const replyCount = record.messages.length - commentCount;

  function addLocation() {
    setComment((current) => `${current}<p>Location: </p>`);
  }

  function addEmoji() {
    setComment((current) => `${current}<p>🙂</p>`);
  }

  function toggleStar(messageId: string) {
    setStarredMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  return (
    <section className="flex min-h-[calc(100dvh-21rem)] flex-col">
      <div className="border-b border-border/70 px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
          <span aria-hidden="true"> · </span>
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-card px-5 pb-5 pt-2">
        <div>
          {record.messages.map((message, messageIndex) => {
            const author = messageAuthorDetails(record, message.createdByUserId);
            const isReply = message.messageType === "reply";
            const isStarred = starredMessageIds.has(message.id);
            const nextMessage = record.messages[messageIndex + 1];
            const endsConversationGroup = !nextMessage || nextMessage.messageType === "comment";
            return (
              <div
                className={
                  endsConversationGroup
                    ? "mb-2 border-b border-border/70 pb-2 last:mb-0 last:border-b-0"
                    : ""
                }
                key={message.id}
              >
                <article
                  className={`relative py-2 pl-8 ${
                    isReply ? "ml-7 border-l border-border/70 md:ml-10" : ""
                  }`}
                >
                  <div
                    className={`absolute top-2.5 flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground ${
                      isReply ? "-left-2.5 size-5" : "left-0 size-6"
                    }`}
                  >
                    {isReply ? (
                      <CornerUpLeft className="size-3" />
                    ) : (
                      <MessageSquare className="size-3.5" />
                    )}
                  </div>
                  <div className="bg-card px-2 py-0.5">
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {editingMessageId === message.id ? (
                          <div className="rounded-md border border-border bg-card p-2">
                            <WorkspaceMinimalEditor
                              className="!bg-background shadow-none [&_.tiptap]:min-h-20"
                              content={editingComment}
                              placeholder={`Edit ${isReply ? "reply" : "comment"}…`}
                              onChange={setEditingComment}
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <Button
                                className="h-7 text-xs"
                                disabled={loading}
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingComment("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="h-7 text-xs"
                                disabled={loading || !plainText(editingComment)}
                                size="sm"
                                type="button"
                                onClick={() =>
                                  void onUpdate(message, editingComment.trim())
                                    .then(() => {
                                      setEditingMessageId(null);
                                      setEditingComment("");
                                    })
                                    .catch(() => undefined)
                                }
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="prose prose-sm max-w-none rounded-md bg-muted/20 px-3 py-2 text-sm leading-5 text-foreground [&_p]:my-0 [&_p+p]:mt-2"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(message.comment) }}
                          />
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <time
                          className="shrink-0 text-[10px] text-muted-foreground/75"
                          dateTime={message.createdAt}
                        >
                          {formatDateTime(message.createdAt)}
                        </time>
                        <Button
                          aria-label={
                            isStarred ? "Unstar conversation entry" : "Star conversation entry"
                          }
                          aria-pressed={isStarred}
                          className="size-6 shrink-0"
                          size="icon"
                          title={isStarred ? "Unstar" : "Star"}
                          type="button"
                          variant="ghost"
                          onClick={() => toggleStar(message.id)}
                        >
                          <Star
                            className={`size-3 ${isStarred ? "fill-current text-amber-500" : ""}`}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={`${isReply ? "Reply" : "Comment"} options`}
                              className="size-6 shrink-0"
                              size="icon"
                              title="More options"
                              type="button"
                              variant="ghost"
                            >
                              <Ellipsis className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              disabled={loading || !message.canEdit}
                              onSelect={() => {
                                setEditingMessageId(message.id);
                                setEditingComment(message.comment);
                              }}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={loading || !message.canDelete}
                              onSelect={() => setDeletingMessage(message)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center justify-end gap-1.5 pr-1">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground/80">
                        {author.name.charAt(0).toUpperCase()}
                      </span>
                      <p className="min-w-0 truncate text-[11px] text-muted-foreground/75">
                        <span className="font-medium text-foreground/60">{author.name}</span>
                        {author.email ? <span> - {author.email}</span> : null}{" "}
                        <span>{isReply ? "added a reply" : "added a comment"}</span>
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        {record.messages.length === 0 ? (
          <WorkspaceTableEmptyState>No comments have been added.</WorkspaceTableEmptyState>
        ) : null}
      </div>

      <div className="sticky bottom-0 border-t border-border/80 bg-card/95 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-1">
          <Button
            size="sm"
            type="button"
            variant={messageType === "reply" ? "secondary" : "ghost"}
            onClick={() => setMessageType("reply")}
          >
            <CornerUpLeft className="size-4" />
            Reply
          </Button>
          <Button
            size="sm"
            type="button"
            variant={messageType === "comment" ? "secondary" : "ghost"}
            onClick={() => setMessageType("comment")}
          >
            <MessageSquare className="size-4" />
            Comment
          </Button>
        </div>
        <div className="overflow-hidden rounded-md border border-border/80 bg-background shadow-sm">
          <WorkspaceMinimalEditor
            className="!rounded-none !border-0 !bg-background shadow-none [&_.tiptap]:min-h-24"
            content={comment}
            placeholder={messageType === "reply" ? "Write a reply…" : "Write a comment…"}
            onChange={setComment}
          />
          <div
            aria-label="Comment tools"
            className="flex items-center gap-1 border-t border-border/70 bg-muted/25 px-2 py-1.5"
            role="toolbar"
          >
            <Button
              aria-label="Open attachments"
              className="size-7 text-muted-foreground"
              disabled={loading}
              size="icon"
              title="Attachments"
              type="button"
              variant="ghost"
              onClick={onOpenAttachments}
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              aria-label="Add location"
              className="size-7 text-muted-foreground"
              disabled={loading}
              size="icon"
              title="Location"
              type="button"
              variant="ghost"
              onClick={addLocation}
            >
              <MapPin className="size-4" />
            </Button>
            <Button
              aria-label="Add emoji"
              className="size-7 text-muted-foreground"
              disabled={loading}
              size="icon"
              title="Emoji"
              type="button"
              variant="ghost"
              onClick={addEmoji}
            >
              <Smile className="size-4" />
            </Button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border/70" />
            <Button
              aria-label="Open dated follow-ups"
              className="size-7 text-muted-foreground"
              disabled={loading}
              size="icon"
              title="Calendar"
              type="button"
              variant="ghost"
              onClick={onOpenCalendar}
            >
              <CalendarDays className="size-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            disabled={loading || !plainText(comment)}
            type="button"
            onClick={() =>
              void onAdd({ comment: comment.trim(), messageType })
                .then(() => setComment(""))
                .catch(() => undefined)
            }
          >
            <Send className="size-4" />
            {messageType === "reply" ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={deletingMessage !== null}
        onOpenChange={(open) => !open && setDeletingMessage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your latest{" "}
              {deletingMessage?.messageType === "reply" ? "reply" : "comment"}. Older entries cannot
              be deleted after a newer comment or reply is added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading || !deletingMessage}
              onClick={(event) => {
                event.preventDefault();
                if (!deletingMessage) return;
                void onDelete(deletingMessage)
                  .then(() => setDeletingMessage(null))
                  .catch(() => undefined);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function TasksTab({
  loading,
  onAdd,
  record
}: {
  loading: boolean;
  onAdd: (input: { dueOn: string | null; status: "pending"; title: string }) => Promise<unknown>;
  record: CrmEnquiry;
}) {
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  return (
    <TabSurface>
      <TabRecordCount count={record.tasks.length} />
      <ChildTable
        columns={["Task", "Status", "Due"]}
        empty="No tasks have been added."
        rows={record.tasks.map((task) => [
          task.title,
          capitalize(task.status),
          task.dueOn ? formatDate(task.dueOn) : "—"
        ])}
      />
      <TabComposer>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_18rem]">
          <Input
            aria-label="Task title"
            disabled={loading}
            placeholder="Task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <WorkspaceDatePicker
            ariaLabel="Task due date"
            placeholder="Due date"
            value={dueOn}
            onValueChange={setDueOn}
          />
        </div>
        <ComposerAction
          disabled={loading || !title.trim()}
          label="Add task"
          onClick={() =>
            void onAdd({ dueOn: dueOn || null, status: "pending", title: title.trim() })
              .then(() => {
                setTitle("");
                setDueOn("");
              })
              .catch(() => undefined)
          }
        />
      </TabComposer>
    </TabSurface>
  );
}

function _NotesTab({
  loading,
  onAdd,
  record
}: {
  loading: boolean;
  onAdd: (input: { note: string }) => Promise<unknown>;
  record: CrmEnquiry;
}) {
  const [note, setNote] = useState("");
  return (
    <TabSurface>
      <TabRecordCount count={record.notes.length} />
      <ChildTable
        columns={["Note", "Created"]}
        empty="No notes have been added."
        rows={record.notes.map((item) => [item.note, formatDateTime(item.createdAt)])}
      />
      <TabComposer>
        <Textarea
          aria-label="New note"
          className="min-h-24 resize-none"
          disabled={loading}
          placeholder="Write a note…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <ComposerAction
          disabled={loading || !note.trim()}
          label="Add note"
          onClick={() =>
            void onAdd({ note: note.trim() })
              .then(() => setNote(""))
              .catch(() => undefined)
          }
        />
      </TabComposer>
    </TabSurface>
  );
}

function AttachmentsTab({
  loading,
  onAdd,
  record
}: {
  loading: boolean;
  onAdd: (input: { fileName: string; fileUrl: string }) => Promise<unknown>;
  record: CrmEnquiry;
}) {
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  return (
    <TabSurface>
      <TabRecordCount count={record.attachments.length} />
      <ChildTable
        columns={["File", "Link", "Created"]}
        empty="No attachments have been added."
        rows={record.attachments.map((attachment) => [
          attachment.fileName,
          <a
            className="font-medium text-primary hover:underline"
            href={attachment.fileUrl}
            key={attachment.uuid}
            rel="noreferrer"
            target="_blank"
          >
            Open
          </a>,
          formatDateTime(attachment.createdAt)
        ])}
      />
      <TabComposer>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            aria-label="Attachment file name"
            disabled={loading}
            placeholder="File name"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
          />
          <Input
            aria-label="Attachment URL"
            disabled={loading}
            placeholder="https://…"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
          />
        </div>
        <ComposerAction
          disabled={loading || !fileName.trim() || !fileUrl.trim()}
          label="Add attachment"
          onClick={() =>
            void onAdd({ fileName: fileName.trim(), fileUrl: fileUrl.trim() })
              .then(() => {
                setFileName("");
                setFileUrl("");
              })
              .catch(() => undefined)
          }
        />
      </TabComposer>
    </TabSurface>
  );
}

function ActivityTab({ record }: { record: CrmEnquiry }) {
  return (
    <TabSurface>
      <TabRecordCount count={record.activities.length} />
      <ChildTable
        columns={["Action", "Details", "Created"]}
        empty="No activity has been recorded."
        rows={record.activities.map((activity) => [
          activity.action.replace(/-/gu, " "),
          activity.details,
          formatDateTime(activity.createdAt)
        ])}
      />
    </TabSurface>
  );
}

function EnquiryProperties({
  canAssign,
  canUpdate,
  jobLoading,
  loading,
  onSave,
  onStartJob,
  onStopJob,
  record,
  users
}: {
  canAssign: boolean;
  canUpdate: boolean;
  jobLoading: boolean;
  loading: boolean;
  onSave: (
    patch: Partial<
      Pick<CrmEnquirySavePayload, "assignedToUserId" | "enquiryGroup" | "priority" | "status">
    >
  ) => Promise<void>;
  onStartJob: () => Promise<unknown>;
  onStopJob: (jobName: string) => Promise<unknown>;
  record: CrmEnquiry;
  users: CrmUserReference[];
}) {
  const runningJobs = record.jobs.filter((job) => job.status === "Running");
  const [editing, setEditing] = useState<
    "assignedToUserId" | "enquiryGroup" | "priority" | "status" | null
  >(null);
  const [assignedToUserId, setAssignedToUserId] = useState(record.assignedToUserId ?? "");
  const [enquiryGroup, setEnquiryGroup] = useState(record.enquiryGroup);
  const [priority, setPriority] = useState(record.priority);
  const [status, setStatus] = useState(record.status);

  useEffect(() => {
    setAssignedToUserId(record.assignedToUserId ?? "");
    setEnquiryGroup(record.enquiryGroup);
    setPriority(record.priority);
    setStatus(record.status);
  }, [record]);

  const groupOptions = Array.from(
    new Set([
      record.enquiryGroup,
      "Stores",
      "DELL",
      "ASUS",
      "Spares",
      "MBO",
      "Service",
      "On-site",
      "Remote - AnyDesk",
      "Follow",
      "Escalation",
      "Admin"
    ])
  )
    .filter(Boolean)
    .map((value) => ({ label: value, value }));

  function cancelEdit() {
    setAssignedToUserId(record.assignedToUserId ?? "");
    setEnquiryGroup(record.enquiryGroup);
    setPriority(record.priority);
    setStatus(record.status);
    setEditing(null);
  }

  async function saveEdit() {
    if (!editing) return;
    const patch =
      editing === "assignedToUserId"
        ? { assignedToUserId: assignedToUserId || null }
        : editing === "enquiryGroup"
          ? { enquiryGroup }
          : editing === "priority"
            ? { priority }
            : { status };
    await onSave(patch);
    setEditing(null);
  }

  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:[&_td]:whitespace-nowrap xl:[&_th]:whitespace-nowrap">
      <WorkspaceShowCard title="Properties">
        <EditablePropertyRow
          disabled={!canUpdate}
          editing={editing === "enquiryGroup"}
          label="List in"
          loading={loading}
          value={record.enquiryGroup || "—"}
          onCancel={cancelEdit}
          onEdit={() => setEditing("enquiryGroup")}
          onSave={saveEdit}
        >
          <WorkspaceSelect
            options={groupOptions}
            placeholder="Choose list"
            value={enquiryGroup}
            onValueChange={setEnquiryGroup}
          />
        </EditablePropertyRow>
        <EditablePropertyRow
          disabled={!canUpdate}
          editing={editing === "priority"}
          label="Priority"
          loading={loading}
          value={capitalize(record.priority)}
          onCancel={cancelEdit}
          onEdit={() => setEditing("priority")}
          onSave={saveEdit}
        >
          <WorkspaceSelect
            options={[
              { label: "Low", swatchClassName: "bg-sky-500", value: "low" },
              { label: "Normal", swatchClassName: "bg-teal-500", value: "normal" },
              { label: "High", swatchClassName: "bg-amber-500", value: "high" },
              { label: "Urgent", swatchClassName: "bg-red-500", value: "urgent" }
            ]}
            value={priority}
            onValueChange={(value) => setPriority(value as CrmEnquirySavePayload["priority"])}
          />
        </EditablePropertyRow>
        <EditablePropertyRow
          disabled={!canUpdate || !canAssign}
          editing={editing === "assignedToUserId"}
          label="Assigned to"
          loading={loading}
          value={record.assignedTo?.name ?? "Unassigned"}
          onCancel={cancelEdit}
          onEdit={() => setEditing("assignedToUserId")}
          onSave={saveEdit}
        >
          <WorkspaceLookup
            allowTextValue={false}
            options={users.map((user) => ({
              description: user.email,
              label: user.name,
              value: user.id
            }))}
            placeholder="Unassigned"
            showAllOptionsOnFocus
            value={assignedToUserId}
            onValueChange={setAssignedToUserId}
          />
        </EditablePropertyRow>
        <div className="border-y border-border/70 p-3">
          <JobControlButton
            active={runningJobs[0]}
            fullWidth
            loading={jobLoading}
            runningCount={runningJobs.length}
            onStart={onStartJob}
            onStop={onStopJob}
          />
        </div>
        <EditablePropertyRow
          disabled={!canUpdate}
          editing={editing === "status"}
          label="Status"
          loading={loading}
          value={capitalize(record.status)}
          onCancel={cancelEdit}
          onEdit={() => setEditing("status")}
          onSave={saveEdit}
        >
          <WorkspaceSelect
            options={[
              { label: "Open", value: "open" },
              { label: "Follow", value: "follow" },
              { label: "Escalation", value: "escalation" },
              { label: "Won", value: "won" },
              { label: "Lost", value: "lost" }
            ]}
            value={status}
            onValueChange={(value) => setStatus(value as CrmEnquirySavePayload["status"])}
          />
        </EditablePropertyRow>
        <WorkspaceDetailTable rows={[["Updated", formatDateTime(record.updatedAt)]]} />
      </WorkspaceShowCard>

      <WorkspaceShowCard title="Customer">
        <WorkspaceDetailTable
          rows={[
            ["Customer", record.customer || "—"],
            ["Mobile", record.mobile || "—"],
            ["Enquiry date", record.enquiryDate || "—"],
            [
              "Schedules",
              record.schedules.length
                ? record.schedules.map((item) => item.scheduledOn).join(", ")
                : "—"
            ]
          ]}
        />
      </WorkspaceShowCard>
    </aside>
  );
}

function EditablePropertyRow({
  children,
  disabled = false,
  editing,
  label,
  loading,
  onCancel,
  onEdit,
  onSave,
  value
}: {
  children: ReactNode;
  disabled?: boolean;
  editing: boolean;
  label: string;
  loading: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onSave: () => Promise<void>;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] border-b border-border/70 text-sm last:border-b-0">
      <div className="bg-muted/30 px-3 py-3 text-xs uppercase text-muted-foreground">{label}</div>
      <div className="min-w-0 px-2 py-1.5">
        {editing ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="min-w-0 flex-1">{children}</div>
            <Button
              aria-label={`Save ${label}`}
              className="size-8 shrink-0"
              disabled={loading}
              size="icon"
              title="Save"
              type="button"
              onClick={() => void onSave().catch(() => undefined)}
            >
              <Check className="size-4" />
            </Button>
            <Button
              aria-label={`Cancel editing ${label}`}
              className="size-8 shrink-0"
              disabled={loading}
              size="icon"
              title="Cancel"
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex min-h-10 min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{value}</span>
            <Button
              aria-label={`Edit ${label}`}
              className="size-8 shrink-0"
              disabled={disabled}
              size="icon"
              title={disabled ? "Update permission is required" : `Edit ${label}`}
              type="button"
              variant="ghost"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabSurface({ children }: { children: ReactNode }) {
  return <section className="flex min-h-[calc(100dvh-21rem)] flex-col">{children}</section>;
}

function TabRecordCount({ count }: { count: number }) {
  return (
    <div className="border-b border-border/70 px-4 py-2">
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "record" : "records"}
      </p>
    </div>
  );
}

function ChildTable({
  columns,
  empty,
  rows
}: {
  columns: string[];
  empty: string;
  rows: ReactNode[][];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column) => (
              <WorkspaceTableHeaderCell key={column}>{column}</WorkspaceTableHeaderCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="border-b border-border/70 last:border-b-0" key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className="px-4 py-3 align-top first:font-medium" key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <WorkspaceTableEmptyState>{empty}</WorkspaceTableEmptyState> : null}
    </div>
  );
}

function TabComposer({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t border-border/80 bg-card/95 p-3 backdrop-blur">
      {children}
    </div>
  );
}

function ComposerAction({
  disabled,
  label,
  onClick
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-2 flex justify-end">
      <Button disabled={disabled} type="button" onClick={onClick}>
        <Send className="size-4" />
        {label}
      </Button>
    </div>
  );
}

function formatDate(value: string) {
  return format(new Date(`${value}T00:00:00`), "dd MMM yyyy");
}

function TabLabel({ count, icon, label }: { count?: number; icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {icon}
      {label}
      {count !== undefined ? (
        <span
          aria-label={`${count} ${label.toLowerCase()}`}
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground"
        >
          {count > 999 ? "999+" : count}
        </span>
      ) : null}
    </span>
  );
}

function capitalize(value: string) {
  return value[0]!.toUpperCase() + value.slice(1);
}

function statusTone(status: CrmEnquiry["status"]): "danger" | "neutral" | "success" | "warning" {
  if (status === "won") return "success";
  if (status === "lost") return "neutral";
  if (status === "escalation") return "danger";
  return status === "follow" ? "warning" : "success";
}

function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

function messageAuthorDetails(record: CrmEnquiry, userId: string | null) {
  const normalizedUserId = userId?.trim().toLowerCase() ?? "";
  const knownUsers = [record.createdBy, record.assignedTo].filter(
    (user): user is CrmUserReference => user !== null
  );
  const knownUser = knownUsers.find(
    (user) =>
      user.id.toLowerCase() === normalizedUserId || user.email.toLowerCase() === normalizedUserId
  );
  if (knownUser) {
    return { email: knownUser.email, name: knownUser.name };
  }
  if (!userId) {
    return { email: "", name: "System" };
  }
  if (userId.includes("@")) {
    const localName = userId
      .split("@")[0]!
      .split(/[._-]+/u)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return { email: userId, name: localName || userId };
  }
  return { email: "", name: userId };
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function enquiryPayload(
  record: CrmEnquiry,
  patch: Partial<
    Pick<CrmEnquirySavePayload, "assignedToUserId" | "enquiryGroup" | "priority" | "status">
  >
): CrmEnquirySavePayload {
  return {
    assignedToUserId: record.assignedToUserId,
    customer: record.customer,
    enquiryDate: record.enquiryDate,
    enquiryGroup: record.enquiryGroup,
    messages: record.messages.map(({ comment }) => ({ comment })),
    mobile: record.mobile,
    priority: record.priority,
    schedules: record.schedules.map(({ scheduledOn }) => ({ scheduledOn })),
    status: record.status,
    title: record.title,
    workspace: record.workspace,
    ...patch
  };
}

function enquiryDisplayTitle(record: Pick<CrmEnquiry, "title" | "workspace">) {
  return plainText(record.workspace) || record.title;
}

function elapsedJobTime(createdAt: string, now: number) {
  const started = Date.parse(createdAt);
  const seconds = Math.max(0, Math.floor((now - (Number.isNaN(started) ? now : started)) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function sanitizeRichText(value: string) {
  if (!/<\/?[a-z][^>]*>/iu.test(value)) {
    return escapeHtml(value).replace(/\n/gu, "<br>");
  }

  const document = new DOMParser().parseFromString(value, "text/html");
  const allowedTags = new Set([
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "EM",
    "H1",
    "H2",
    "H3",
    "HR",
    "LI",
    "OL",
    "P",
    "PRE",
    "S",
    "STRONG",
    "UL"
  ]);

  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ""));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }
  }

  return document.body.innerHTML;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#039;");
}
