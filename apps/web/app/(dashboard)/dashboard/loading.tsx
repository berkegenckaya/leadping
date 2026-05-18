import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <Card className="shadow-none border-zinc-200">
      <CardHeader className="pb-1 pt-4 px-4">
        <Skeleton className="h-3 w-24" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Skeleton className="h-8 w-16 mt-1" />
        <Skeleton className="h-3 w-28 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Conversations skeleton */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Widgets skeleton */}
        <Card className="shadow-none border-zinc-200">
          <CardHeader className="px-4 pt-4 pb-3">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
