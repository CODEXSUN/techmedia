import { CircleCheckBigIcon, Clock3Icon, MessagesSquareIcon, UserRoundIcon } from "lucide-react";
import { Card, CardContent } from "@codexsun/ui/components/card";
import { Skeleton } from "@codexsun/ui/components/skeleton";
import { useCrmOverviewQuery } from "./crm.hooks";
import type { CrmEnquiryOverview } from "./crm.types";

type CrmOverviewProps = {
  signedInUser: {
    email: string;
    name: string;
  };
};

const number = new Intl.NumberFormat();

export function CrmOverview({ signedInUser }: CrmOverviewProps) {
  const query = useCrmOverviewQuery();

  return (
    <section className="space-y-4">
      <CrmHero signedInUser={signedInUser} />
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

function CrmHero({ signedInUser }: CrmOverviewProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-lg border border-emerald-200/80 bg-card px-6 py-4 text-card-foreground shadow-sm dark:border-emerald-900/70 md:px-10 md:py-5">
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 dark:from-card dark:via-emerald-950/25 dark:to-teal-950/20" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
      <div className="absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-emerald-200/45 blur-3xl dark:bg-emerald-700/10" />
      <div className="absolute -bottom-24 left-1/3 -z-10 size-52 rounded-full bg-teal-100/70 blur-3xl dark:bg-teal-700/10" />
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <MessagesSquareIcon className="size-3.5" />
            CRM workspace
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-foreground xl:whitespace-nowrap">
            Keep your enquiries moving with clear follow-up.
          </h1>
          <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-muted-foreground xl:whitespace-nowrap">
            Focus on the enquiries assigned to you and created by you.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-4 py-2 text-sm font-medium text-emerald-950 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 lg:justify-self-end">
          <UserRoundIcon className="size-4" />
          <span>
            Signed in as {signedInUser.name} - {signedInUser.email}
          </span>
        </div>
      </div>
    </div>
  );
}

function EnquiryStats({ stats }: { stats: CrmEnquiryOverview["stats"] }) {
  const items = [
    {
      description: "Assigned to you",
      icon: MessagesSquareIcon,
      label: "My enquiries",
      value: stats.myEnquiries
    },
    {
      description: "Created by you",
      icon: MessagesSquareIcon,
      label: "Created by me",
      value: stats.createdByMe
    },
    {
      description: "Work in progress",
      icon: Clock3Icon,
      label: "In progress",
      value: stats.inProgress
    },
    {
      description: "Your completed follow-up",
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
          <Card key={item.label} className="overflow-hidden shadow-sm">
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
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
              </div>
            </CardContent>
          </Card>
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
