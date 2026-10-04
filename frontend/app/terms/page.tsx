export const metadata = {
  title: "Terms of Use — VehiclePart",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Use</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last updated: {new Date().getFullYear()}
      </p>

      <div className="mt-8 space-y-7 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. Using VehiclePart</h2>
          <p className="text-muted-foreground">
            VehiclePart is a marketplace connecting buyers with verified sellers of vehicle
            spare parts. By using the site you agree to provide accurate information, use the
            platform lawfully, and not attempt to disrupt or misuse the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. Accounts</h2>
          <p className="text-muted-foreground">
            You are responsible for keeping your login credentials secure. Sellers and admins
            receive access to dedicated dashboards in accordance with their role and
            verification status.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. Orders &amp; payments</h2>
          <p className="text-muted-foreground">
            Prices, discounts and availability are set by sellers and may change without notice.
            Payments are collected through Razorpay. For online payments, the order is confirmed
            only after successful verification of the payment. Cash-on-delivery orders are
            confirmed immediately and paid on delivery.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. Returns &amp; refunds</h2>
          <p className="text-muted-foreground">
            Eligible returns and refunds are processed according to the return window shown on
            the product and order pages. Parts must be returned in their original condition
            unless they arrived damaged or defective.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. Seller responsibilities</h2>
          <p className="text-muted-foreground">
            Sellers must list genuine, accurately described parts, maintain honest stock levels,
            and fulfil orders promptly. Listing counterfeit or misrepresented parts leads to
            removal from the marketplace.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Liability</h2>
          <p className="text-muted-foreground">
            VehiclePart facilitates transactions between buyers and sellers and is not liable
            for product performance beyond the warranty offered by the seller. Nothing in these
            terms limits rights you have under applicable consumer law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Changes &amp; contact</h2>
          <p className="text-muted-foreground">
            We may update these terms from time to time. Continued use after changes means you
            accept the revised terms. Questions? Email support@vehiclepart.com.
          </p>
        </section>
      </div>
    </div>
  );
}
