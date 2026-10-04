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
      <div className="vp-container grid grid-cols-1 gap-x-6 gap-y-5 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:py-10">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              {f.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground">{f.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
