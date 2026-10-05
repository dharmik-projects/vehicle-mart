import { ListRowsSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="vp-main">
      <ListRowsSkeleton count={6} />
    </div>
  );
}
