export const metadata = {
  title: "Privacy Policy — VehiclePart",
};

export default function PrivacyPage() {
  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Privacy Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: {new Date().getFullYear()}
        </p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">1. Information we collect</h2>
            <p className="text-muted-foreground">
              When you create an account or place an order, we collect your name, email address,
              phone number, delivery addresses, and order history. Sellers additionally provide
              business details required for verification and payouts. We never collect payment
              card details — payments are processed securely by Razorpay.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">2. How we use your information</h2>
            <p className="text-muted-foreground">
              We use your information to process orders, deliver parts, provide customer support,
              prevent fraud, and comply with legal obligations. We do not sell your personal data
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">3. Sharing</h2>
            <p className="text-muted-foreground">
              Order details are shared with the seller fulfilling your order and with the courier
              partner delivering it. Payment information is handled by our payment gateway under
              its own secure and encrypted processes.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">4. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies to keep you signed in and to remember your cart and
              wishlist. You can disable cookies in your browser, though some features may stop
              working.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">5. Data retention &amp; security</h2>
            <p className="text-muted-foreground">
              We retain account and order records for as long as your account is active or as
              required by law. Data is stored with industry-standard encryption and access
              controls.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">6. Your rights</h2>
            <p className="text-muted-foreground">
              You can view and update your profile information any time from your account page.
              To request deletion of your account and associated data, contact
              support@vehiclepart.com.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold sm:text-xl">7. Contact</h2>
            <p className="text-muted-foreground">
              Questions about this policy? Email support@vehiclepart.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
