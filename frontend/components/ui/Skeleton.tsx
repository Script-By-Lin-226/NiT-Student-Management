import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/60", className)}
      {...props}
    />
  );
}

export function StatisticSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-12" />
      </div>
      <Skeleton className="h-10 w-10 rounded-2xl" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 flex flex-col min-h-[350px]">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex-1 flex items-end gap-2 pb-5">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableBodySkeleton({ columns = 5, rows = 5 }: { columns?: number, rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="hover:bg-slate-50 transition-colors">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <Skeleton className="h-4 w-full max-w-[200px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 bg-white hover:bg-blue-50 hover:shadow-md transition-colors space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-[200px]">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
