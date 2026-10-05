"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderTree, Package } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await cached("categories", () => api.getCategories());
        setCategories(data.categories || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-muted p-2.5 text-foreground">
          <FolderTree className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">All Categories</h1>
          <p className="truncate text-sm text-muted-foreground">Browse parts by category</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 sm:p-5">
              <Skeleton className="mx-auto mb-3 h-10 w-10 rounded-lg" />
              <Skeleton className="mx-auto mb-1 h-4 w-24" />
              <Skeleton className="mx-auto h-3 w-16" />
            </div>
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
          {categories.map((cat) => (
            <div key={cat._id} className="flex min-w-0 flex-col gap-2">
              <Link href={`/products?category=${cat._id}`} className="group">
                <div className="vp-card vp-card-hover h-full p-4 text-center sm:p-5">
                  <span className="mb-3 block text-3xl transition-transform group-hover:scale-110 sm:text-4xl">{cat.icon || "📦"}</span>
                  <h2 className="break-words text-[15px] font-medium text-foreground transition-colors group-hover:text-primary sm:text-base">{cat.name}</h2>
                  {cat.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cat.description}</p>
                  )}
                  {cat.children && cat.children.length > 0 && (
                    <p className="mt-2 text-xs font-medium text-primary">{cat.children.length} sub-categories</p>
                  )}
                </div>
              </Link>
              {/* Every child category is reachable right here */}
              {cat.children && cat.children.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cat.children.map((child: any) => (
                    <Link
                      key={child._id}
                      href={`/products?category=${child._id}`}
                      className="inline-flex min-h-10 items-center break-words rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs leading-tight text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted py-16 text-center">
          <Package className="mx-auto mb-3 h-12 w-12 text-foreground" />
          <h2 className="mb-1 text-lg font-semibold text-foreground">No categories found</h2>
          <p className="text-sm text-muted-foreground">Categories will appear here once added</p>
        </div>
      )}
    </div>
  );
}
