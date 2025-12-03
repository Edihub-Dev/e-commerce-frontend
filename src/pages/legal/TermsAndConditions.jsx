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
          <p className="text-base text-slate-600">
            Thanks for shopping with p2pdeal. By accessing our website, creating
            an account, or placing an order, you agree to the following terms
            that keep the experience safe and transparent for everyone.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Accounts & eligibility
          </h2>
          <p className="text-slate-600">
            You must be at least 18 years of age (or the legal age of majority
            in your region) to register. Keep your login credentials
            confidential, as you are responsible for all actions that happen
            through your account. Please notify us immediately if you suspect
            unauthorised access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Pricing & payment
          </h2>
          <p className="text-slate-600">
            Prices shown on p2pdeal are in INR and include applicable taxes
            unless noted otherwise. We may update pricing, promotions, or
            product availability without prior notice. Payments are processed
            securely via trusted gateways; we do not store complete card
            information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Orders & fulfilment
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>
              Orders are confirmed once payment is captured or COD verification
              succeeds.
            </li>
            <li>
              In rare cases where stock or quality checks fail, we will cancel
              the order and issue store credit or a replacement as per
              availability.
            </li>
            <li>
              Delivery timelines depend on serviceable pin codes and logistics
              partner performance; delays will be communicated via email or SMS.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Return & replacement policy
          </h2>
          <p className="text-slate-600">
            We follow a replacement-first approach. Eligible products can be
            returned within 7 days of delivery for a like-for-like replacement
            or p2pdeal store credit. Cash refunds to the original payment method
            are not available. Detailed steps are listed in our Return &
            Replacement Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Usage guidelines
          </h2>
          <p className="text-slate-600">
            Do not misuse the site by attempting unauthorised access, scraping,
            or uploading harmful code. Product reviews or questions you post
            must be respectful, accurate, and free of infringing material. We
            reserve the right to remove content or suspend accounts that violate
            these expectations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Intellectual property
          </h2>
          <p className="text-slate-600">
            All text, graphics, logos, and product imagery available on p2pdeal
            are owned by p2pdeal or our brand partners. You may not reproduce or
            reuse any portion without prior written consent from the respective
            owner.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Limitation of liability
          </h2>
          <p className="text-slate-600">
            p2pdeal’s total liability for any claim relating to an order is
            limited to the amount you paid for that order. We are not
            responsible for indirect, incidental, or consequential damages
            arising from use of the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Contact us</h2>
          <p className="text-slate-600">
            Questions about these terms? Email
            <a
              href="mailto:megamart@edihub.in"
              className="text-primary underline ml-1"
            >
              megamart@edihub.in
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
};

export default TermsAndConditions;
