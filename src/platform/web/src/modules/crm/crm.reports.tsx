import { useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Card, CardContent } from "@codexsun/ui/components/card";
import { WorkspaceDatePicker } from "@codexsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { useCrmReportQuery, useCrmUsersQuery } from "./crm.hooks";
import { crmEnquiryListInOptions } from "./crm.options";
import type { CrmReport, CrmReportName } from "./crm.types";

type Filters = {
  assignedToEmployee: string;
  fromDate: string;
  group: string;
  toDate: string;
};

const emptyFilters: Filters = {
  assignedToEmployee: "",
  fromDate: "",
  group: "",
  toDate: ""
};

export function CrmReports() {
  const [report, setReport] = useState<CrmReportName>("list-in-status");
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const query = useCrmReportQuery(report, filters);
  const users = useCrmUsersQuery();
  const listIn = report === "list-in-status";

  function resetFilters() {
    setDraft({ ...emptyFilters });
    setFilters({ ...emptyFilters });
  }

  return (
    <WorkspacePage
      actions={
        <Button
          disabled={query.isFetching}
          onClick={() => query.refetch()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={query.isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
        </Button>
      }
      description="Live status reports from Frappe."
      technicalName="page.crm.reports"
      title="Enquiry reports"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setReport("list-in-status")}
          type="button"
          variant={listIn ? "default" : "outline"}
        >
          List-In wise status
        </Button>
        <Button
          onClick={() => setReport("owner-status")}
          type="button"
          variant={!listIn ? "default" : "outline"}
        >
          Owner wise status
        </Button>
      </div>
      <Card className="shadow-sm">
        <CardContent className="flex min-w-0 gap-3 overflow-x-auto p-4">
          <div className="min-w-44">
            <WorkspaceDatePicker
              ariaLabel="From date"
              onValueChange={(fromDate) => setDraft((value) => ({ ...value, fromDate }))}
              placeholder="From date"
              value={draft.fromDate}
            />
          </div>
          <div className="min-w-44">
            <WorkspaceDatePicker
              ariaLabel="To date"
              onValueChange={(toDate) => setDraft((value) => ({ ...value, toDate }))}
              placeholder="To date"
              value={draft.toDate}
            />
          </div>
          {listIn ? (
            <WorkspaceLookup
              allowTextValue={false}
              className="min-w-64 flex-1"
              loading={users.isFetching}
              onValueChange={(assignedToEmployee) =>
                setDraft((value) => ({ ...value, assignedToEmployee }))
              }
              options={(users.data ?? []).map((user) => ({
                description: user.email,
                label: user.name,
                value: user.id
              }))}
              placeholder="Assigned to"
              showAllOptionsOnFocus
              value={draft.assignedToEmployee}
            />
          ) : (
            <WorkspaceLookup
              allowTextValue={false}
              className="min-w-64 flex-1"
              onValueChange={(group) => setDraft((value) => ({ ...value, group }))}
              options={crmEnquiryListInOptions}
              placeholder="List in"
              showAllOptionsOnFocus
              value={draft.group}
            />
          )}
          <Button className="shrink-0" onClick={() => setFilters(draft)} type="button">
            Apply filters
          </Button>
          <Button className="shrink-0" onClick={resetFilters} type="button" variant="outline">
            <RotateCcw className="size-4" /> Reset
          </Button>
        </CardContent>
      </Card>
      {query.isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "The Frappe report could not be loaded."}
          </CardContent>
        </Card>
      ) : null}
      {query.data ? (
        <ReportTable key={`${report}:${JSON.stringify(filters)}`} report={query.data} />
      ) : null}
    </WorkspacePage>
  );
}

function ReportTable({ report }: { report: CrmReport }) {
  const [sort, setSort] = useState<{ direction: "asc" | "desc"; fieldname: string } | null>(null);
  const totalRows = report.rows.filter(isTotalRow);
  const rows = report.rows
    .filter((row) => !isTotalRow(row))
    .sort((left, right) => compareReportRows(left, right, sort));
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="overflow-x-auto p-3">
        <table className="w-full min-w-max border-collapse border border-border text-sm">
          <thead className="bg-muted/70 text-center text-muted-foreground">
            <tr>
              <th className="w-10 min-w-10 max-w-10 border border-border px-1 py-3 font-medium">
                #
              </th>
              {report.columns.map((column) => (
                <th
                  className={`border border-border px-4 py-3 font-medium ${
                    isTotalColumn(column.label) ? "bg-muted/70" : ""
                  } ${isIdentityColumn(column.label) ? "text-left" : ""}`}
                  key={column.fieldname}
                >
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() =>
                      setSort((current) => ({
                        direction:
                          current?.fieldname === column.fieldname && current.direction === "asc"
                            ? "desc"
                            : "asc",
                        fieldname: column.fieldname
                      }))
                    }
                    type="button"
                  >
                    {column.label}
                    {sort?.fieldname === column.fieldname ? (
                      sort.direction === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows, ...totalRows].map((row, index) => (
              <tr className={isTotalRow(row) ? "bg-muted/70 font-medium" : undefined} key={index}>
                <td className="w-10 min-w-10 max-w-10 border border-border px-1 py-3 text-center text-muted-foreground">
                  {isTotalRow(row) ? "" : index + 1}
                </td>
                {report.columns.map((column) => (
                  <td
                    className={`border border-border px-4 py-3 text-center ${
                      isTotalColumn(column.label) ? "bg-muted/70" : ""
                    } ${isIdentityColumn(column.label) ? "text-left" : ""} ${
                      isDimReportValue(row[column.fieldname]) ? "text-muted-foreground" : ""
                    }`}
                    key={column.fieldname}
                  >
                    {row[column.fieldname] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td
                  className="border border-border px-4 py-8 text-center text-muted-foreground"
                  colSpan={Math.max(report.columns.length + 1, 1)}
                >
                  No report rows match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function compareReportRows(
  left: Record<string, number | string | null>,
  right: Record<string, number | string | null>,
  sort: { direction: "asc" | "desc"; fieldname: string } | null
) {
  if (!sort) return 0;
  const a = left[sort.fieldname] ?? "";
  const b = right[sort.fieldname] ?? "";
  const comparison =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true });
  return sort.direction === "asc" ? comparison : -comparison;
}

function isTotalColumn(label: string) {
  return label.trim().toLowerCase() === "total";
}

function isIdentityColumn(label: string) {
  return ["assigned to", "list in"].includes(label.trim().toLowerCase());
}

function isTotalRow(row: Record<string, number | string | null>) {
  return Object.values(row).some(
    (value) => typeof value === "string" && value.trim().toLowerCase() === "total"
  );
}

function isDimReportValue(value: number | string | null | undefined) {
  return value === null || value === undefined || value === 0 || value === "-" || value === "—";
}
