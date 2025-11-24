import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsAndConditions = () => {
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
            Terms & Conditions
          </h1>
          <p className="text-sm text-slate-500">
            Last updated on {new Date().toLocaleDateString("en-IN")}
          </p>
          <p className="text-base text-slate-600">
            Welcome to MegaMart. By accessing or purchasing through our
            platform, you agree to the terms outlined below. Please read them
            carefully to understand your rights and responsibilities as a
            MegaMart customer.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Account & Eligibility
          </h2>
          <p className="text-slate-600">
            You must be at least 18 years old (or the age of majority in your
            jurisdiction) to create a MegaMart account. You are responsible for
            maintaining the confidentiality of your login credentials and for
            all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Pricing & Payment
          </h2>
          <p className="text-slate-600">
            Product prices are displayed in Indian Rupees (INR) and are
            inclusive of applicable taxes unless otherwise stated. We reserve
            the right to modify prices, promotions, or product availability
            without advance notice. Payments are processed securely through
            accredited providers such as Razorpay or PhonePe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Order Policy</h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>Orders are confirmed only after successful payment capture.</li>
            <li>
              MegaMart may cancel orders that cannot be fulfilled due to stock
              or quality issues; you will receive a full refund in such cases.
            </li>
            <li>
              Cash-on-delivery orders are subject to verification and
              serviceable pin codes.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Intellectual Property
          </h2>
          <p className="text-slate-600">
            All product images, descriptions, brand assets, and trademarks on
            MegaMart remain the property of their respective owners. You may not
            copy, reproduce, or distribute any content without written consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Limitation of Liability
          </h2>
          <p className="text-slate-600">
            MegaMart is not liable for indirect or consequential damages arising
            from the use of our services. Our liability is limited to the amount
            you paid for the product in dispute.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Contact Us</h2>
          <p className="text-slate-600">
            For queries about these terms, write to
            <a
              href="mailto:megamart@edihub.in"
              className="text-primary underline ml-1"
            >
              megamart@edihub.in
            </a>
            , or call our helpline at +1 202-918-2132.
          </p>
        </section>
      </div>
    </main>
  );
};

export default TermsAndConditions;
