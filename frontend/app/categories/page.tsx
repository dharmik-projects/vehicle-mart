"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCategories();
        setCategories(data.categories || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-bold mb-6">All Categories</h1>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link key={cat._id} href={`/products?category=${cat._id}`}>
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer">
                <CardContent className="p-6 text-center">
                  <span className="text-4xl mb-3 block">{cat.icon || '📦'}</span>
                  <h3 className="font-semibold">{cat.name}</h3>
                  {cat.description && <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>}
                  {cat.children && cat.children.length > 0 && (
                    <p className="text-xs text-primary mt-2">{cat.children.length} sub-categories</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
