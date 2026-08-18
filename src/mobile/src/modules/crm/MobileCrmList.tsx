import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonSpinner
} from "@ionic/react";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { BellRing, Trash2 } from "lucide-react";
import {
  EnquiryStatusBadge,
  type CrmListProps
} from "../../../../platform/web/src/modules/crm/crm.list";
import type { CrmEnquiry } from "../../../../platform/web/src/modules/crm/crm.types";

export function MobileCrmList(props: CrmListProps) {
  if (props.records.length === 0) return <MobileCrmListState {...props} />;

  return (
    <section className="mobile-crm-card-list" aria-label="CRM enquiries">
      {props.records.map((record) => (
        <MobileCrmCard key={record.id} record={record} {...props} />
      ))}
    </section>
  );
}

function MobileCrmCard({ record, ...props }: CrmListProps & { record: CrmEnquiry }) {
  const open = () => (props.onRowClick ?? props.onView)(record);
  const title = plainText(record.title) || plainText(record.workspace) || "Untitled enquiry";

  return (
    <IonCard className="mobile-crm-card" mode="md" onDoubleClick={open}>
      <IonCardHeader className="mobile-crm-card-header">
        <div className="mobile-crm-card-topline">
          <IonCardSubtitle>Call #{record.id}</IonCardSubtitle>
          <EnquiryStatusBadge record={record} />
        </div>
        <IonCardTitle>{record.customerName || record.customer || title}</IonCardTitle>
        {record.customer ? <p className="mobile-crm-card-summary">{title}</p> : null}
      </IonCardHeader>
      <IonCardContent className="mobile-crm-card-content">
        {record.hasUnreadAssignment || (props.maskNewCalls && record.status === "new") ? (
          <IonBadge className="mobile-crm-new-badge" color="primary">
            <BellRing aria-hidden="true" /> New call
          </IonBadge>
        ) : null}
        <dl className="mobile-crm-card-details">
          {props.visibleColumns.mobile ? <Detail label="Mobile" value={record.mobile || "—"} /> : null}
          {props.visibleColumns.enquiryGroup ? (
            <Detail label="List in" value={record.enquiryGroup || "—"} />
          ) : null}
          {props.visibleColumns.dueDate ? (
            <Detail label="Due date" value={formattedDueDate(record)} />
          ) : null}
          {props.visibleColumns.assignedTo ? (
            <Detail label="Assigned to" value={record.assignedTo?.name ?? "Unassigned"} />
          ) : null}
        </dl>
        <div className="mobile-crm-card-footer">
          <IonBadge className={`mobile-crm-priority is-${record.priority}`} color="light">
            {labelFor(record.priority)} priority
          </IonBadge>
          <div className="mobile-crm-card-actions">
            <WorkspaceRowActions
              {...(props.onForceDelete
                ? {
                    actions: [
                      {
                        id: "force-delete",
                        icon: <Trash2 className="size-4" />,
                        label: "Force delete",
                        onSelect: () => props.onForceDelete?.(record),
                        tone: "destructive" as const
                      }
                    ]
                  }
                : {})}
              deleteLabel="Suspend"
              isSuspended={record.lifecycleStatus === "suspended"}
              {...(props.onSelect && record.lifecycleStatus === "active"
                ? { onEdit: () => props.onSelect?.(record) }
                : {})}
              {...(props.onRestore ? { onRestore: () => props.onRestore?.(record) } : {})}
              {...(props.onSuspend ? { onDelete: () => props.onSuspend?.(record) } : {})}
              onView={() => props.onView(record)}
              restoreLabel="Restore"
              title={`Enquiry #${record.id}`}
            />
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function MobileCrmListState({ error, loading }: CrmListProps) {
  return (
    <div className="mobile-crm-list-state" role="status">
      {loading ? <IonSpinner name="crescent" /> : null}
      <strong>{loading ? "Loading calls" : error ? "Calls could not be loaded" : "No calls found"}</strong>
      {!loading && error ? <span>Use Refresh to try again.</span> : null}
    </div>
  );
}

function formattedDueDate(record: CrmEnquiry) {
  const value = record.schedules[0]?.scheduledOn;
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function labelFor(value: string) {
  return value[0]?.toUpperCase() + value.slice(1);
}

function plainText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/giu, " ")
    .replace(/<\/p\s*>/giu, " ")
    .replace(/<[^>]*>/gu, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}
