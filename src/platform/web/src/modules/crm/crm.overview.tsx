import { CircleCheckBigIcon, Clock3Icon, MessagesSquareIcon } from "lucide-react";
import { Card, CardContent } from "@codexsun/ui/components/card";
import { Skeleton } from "@codexsun/ui/components/skeleton";
import { useCrmOverviewQuery } from "./crm.hooks";
import type { CrmEnquiryOverview } from "./crm.types";

const number = new Intl.NumberFormat();

export function CrmOverview() {
  const query = useCrmOverviewQuery();

  return (
    <section className="space-y-4">
      {query.isLoading ? <OverviewSkeleton /> : null}
      {query.isError ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="p-4 text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Enquiry overview could not be loaded."}
          </CardContent>
        </Card>
      ) : null}
      {query.data ? <EnquiryStats stats={query.data.stats} /> : null}
    </section>
  );
}

function EnquiryStats({ stats }: { stats: CrmEnquiryOverview["stats"] }) {
  const items = [
    {
      description: "Assigned to you",
      href: "/app/crm/assigned?status=active",
      icon: MessagesSquareIcon,
      label: "My enquiries",
      value: stats.myEnquiries
    },
    {
      description: "Created by you",
      href: "/app/crm/created?status=active",
      icon: MessagesSquareIcon,
      label: "Created by me",
      value: stats.createdByMe
    },
    {
      description: "Work in progress",
      href: "/app/crm/assigned?status=in-progress",
      icon: Clock3Icon,
      label: "In progress",
      value: stats.inProgress
    },
    {
      description: "Your completed follow-up",
      href: "/app/crm/assigned?status=closed",
      icon: CircleCheckBigIcon,
      label: "Closed by me",
      value: stats.closedByMe
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            aria-label={`${item.label}: ${number.format(item.value)}. Open list.`}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={item.href}
            key={item.label}
          >
            <Card className="overflow-hidden shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-lg group-active:translate-y-0">
              <CardContent className="relative p-4">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/70" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      {number.format(item.value)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </a>
        );
      })}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="p-4 shadow-sm">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-8 w-14" />
          <Skeleton className="mt-2 h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}
