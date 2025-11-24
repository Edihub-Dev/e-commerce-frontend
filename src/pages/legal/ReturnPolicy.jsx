import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ReturnPolicy = () => {
  const navigate = useNavigate();

  return (
    <main className="px-4 py-10 sm:px-8 lg:px-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-secondary">
            Return Policy
          </h1>
          <p className="text-sm text-slate-500">
            Last updated on {new Date().toLocaleDateString("en-IN")}
          </p>
          <p className="text-base text-slate-600">
            We want you to love every product you purchase from MegaMart. If you
            are not satisfied, review the guidelines below to understand how
            returns, replacements, and refunds work on our store.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Eligibility</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>Return requests must be raised within 7 days of delivery.</li>
            <li>
              Items must be unused, in their original packaging, and include all
              accessories or freebies.
            </li>
            <li>
              Customized, perishable, or clearance products are non-returnable
              unless they arrive damaged.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            How to Initiate a Return
          </h2>
          <ol className="list-decimal pl-6 space-y-2 text-slate-600">
            <li>Go to My Orders and select the item you wish to return.</li>
            <li>
              Choose the reason for return and upload supporting photos if the
              product was damaged or defective.
            </li>
            <li>
              Our support team will confirm pick-up details or provide a
              self-ship address within 24 hours.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Refunds & Replacements
          </h2>
          <p className="text-slate-600">
            Refunds are processed within 5-7 business days after the returned
            product clears quality checks. The amount is credited to your
            original payment method or to MegaMart credits based on your
            preference. Replacements are shipped once availability is confirmed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Contact Us</h2>
          <p className="text-slate-600">
            Need help? Email
            <a
              href="mailto:megamart@edihub.in"
              className="text-primary underline ml-1"
            >
              megamart@edihub.in
            </a>{" "}
            or call our returns desk at +1 202-918-2132.
          </p>
        </section>
      </div>
    </main>
  );
};

export default ReturnPolicy;
