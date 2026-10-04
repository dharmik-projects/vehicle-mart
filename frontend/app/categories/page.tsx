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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-muted text-foreground rounded-xl">
          <FolderTree className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">All Categories</h1>
          <p className="text-sm text-muted-foreground">Browse parts by category</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 sm:p-5">
              <Skeleton className="h-10 w-10 rounded-lg mx-auto mb-3" />
              <Skeleton className="h-4 w-24 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link key={cat._id} href={`/products?category=${cat._id}`} className="group">
              <div className="bg-card rounded-lg border border-border p-4 sm:p-5 text-center hover:shadow-soft transition-all h-full">
                <span className="text-3xl sm:text-4xl block mb-3 group-hover:scale-110 transition-transform">{cat.icon || "📦"}</span>
                <h3 className="text-[15px] sm:text-base font-medium text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                {cat.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                )}
                {cat.children && cat.children.length > 0 && (
                  <p className="text-xs text-primary font-medium mt-2">{cat.children.length} sub-categories</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-muted rounded-lg border border-border">
          <Package className="h-12 w-12 text-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-1">No categories found</h2>
          <p className="text-sm text-muted-foreground">Categories will appear here once added</p>
        </div>
      )}
    </div>
  );
}
