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
            Return & Replacement Policy
          </h1>
          <p className="text-base text-slate-600">
            We stand behind every order that ships from MegaMart. If something
            isn’t quite right, we’ll help you send the item back and arrange a
            replacement or issue store credit so you can try again—no cash
            refunds or reversals to original payment methods are provided.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            What qualifies for a return?
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>
              Submit the return request within 7 days of the delivery date shown
              in your MegaMart account.
            </li>
            <li>
              The product must be unused, in resalable condition, and include
              all tags, accessories, manuals, and any bundled freebies.
            </li>
            <li>
              Items marked as final sale, custom-built, or perishable can only
              be returned if they arrive damaged or incorrect.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            How returns work
          </h2>
          <ol className="list-decimal pl-6 space-y-2 text-slate-600">
            <li>
              Open <strong>My Orders</strong>, choose the product, and tap
              <em>Request Return</em> with a short note on what went wrong.
            </li>
            {/* <li>
              If the issue is physical damage or a defect, attach 1–2 clear
              photos so our team can fast-track the review.
            </li> */}
            <li>
              We’ll share pick-up or self-ship instructions within 24 hours.
              Self-ship charges are reimbursed as store credit once verified.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Replacements & Store Credits
          </h2>
          <p className="text-slate-600">
            Once the returned product clears quality checks, we’ll dispatch a
            like-for-like replacement (subject to availability) or issue
            MegaMart store credit you can use on future purchases. Store credit
            is posted within 7 business days of approval. Cash refunds or
            reversal to the original payment method are not offered.
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
            </a>
          </p>
        </section>
      </div>
    </main>
  );
};

export default ReturnPolicy;
