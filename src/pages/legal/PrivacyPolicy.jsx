import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
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
            Privacy Policy
          </h1>
          <p className="text-base text-slate-600">
            Your trust matters. This notice describes how p2pdeal collects,
            uses, and protects information when you browse products, create an
            account, place an order, or request a return/replacement.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Information we collect
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>
              Profile details you provide—name, email, phone number, shipping
              addresses, and GST information for business buyers.
            </li>
            <li>
              Order and support history, including return and replacement
              interactions, so we can resolve issues faster the next time.
            </li>
            <li>
              Payment method references (tokenised by our gateway) to process
              transactions. We never store full card numbers.
            </li>
            <li>
              Device, app, and usage data (such as browser type, pages visited,
              on-site searches) gathered via cookies to improve performance and
              detect fraud.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            How we use your data
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>
              Fulfil orders, schedule deliveries, and manage returns or
              replacements in line with our Return & Replacement Policy.
            </li>
            <li>
              Personalise product recommendations, price alerts, and marketing
              messages (only when you opt in).
            </li>
            <li>
              Send transactional notifications about order status, pick-up
              schedules, and support resolutions.
            </li>
            <li>
              Secure the platform, prevent misuse, and comply with
              record-keeping, taxation, and other legal requirements.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            How we protect & share data
          </h2>
          <p className="text-slate-600">
            We apply encryption, network monitoring, and role-based access to
            keep your data safe. Information is shared only with verified
            partners who enable payments, logistics, analytics, or customer
            support. Each partner is bound by confidentiality agreements and is
            permitted to use the data solely to serve p2pdeal customers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Your controls & choices
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>
              Visit <strong>My Profile</strong> to update contact details,
              addresses, or delete saved payment references.
            </li>
            <li>
              Manage email preferences using the unsubscribe link or the
              notifications settings in your account.
            </li>
            <li>
              If you need a copy of your data or want us to delete your account,
              contact us from your registered email for verification.
            </li>
            <li>
              Most browsers allow you to control cookies. Disabling them may
              impact features like saved carts or personalised suggestions.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Contact us</h2>
          <p className="text-slate-600">
            Questions about this policy or your information? Email
            <a
              href="mailto:support@p2pdeal.net"
              className="text-primary underline ml-1"
            >
              support@p2pdeal.net
            </a>
            . We respond to privacy requests within 7 business days.
          </p>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
