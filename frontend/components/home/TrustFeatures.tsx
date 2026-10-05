import { ShieldCheck, Truck, RotateCcw, BadgeCheck } from "lucide-react";

/* Same promises the footer has always shown — presented as a proper section
   with short descriptions. Static site copy, not product data. */
const FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "100% Genuine Parts",
    desc: "Sourced from verified suppliers across India.",
  },
  {
    icon: <Truck className="h-5 w-5" />,
    title: "Pan-India Delivery",
    desc: "Shipped to cities and towns nationwide.",
  },
  {
    icon: <RotateCcw className="h-5 w-5" />,
    title: "Easy Returns",
    desc: "Simple returns when something isn't right.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Verified Sellers",
    desc: "Every seller is reviewed before onboarding.",
  },
];

/** Trust features strip — headingless, sits right above the footer. */
export default function TrustFeatures() {
  return (
    <section aria-label="Why shop with us" className="border-t border-border bg-card">
      <div className="vp-container grid grid-cols-1 gap-x-8 gap-y-6 py-9 sm:grid-cols-2 lg:grid-cols-4 lg:py-11">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              {f.icon}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
