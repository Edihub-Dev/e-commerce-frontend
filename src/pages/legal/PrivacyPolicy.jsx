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
          <p className="text-sm text-slate-500">
            Last updated on {new Date().toLocaleDateString("en-IN")}
          </p>
          <p className="text-base text-slate-600">
            At MegaMart, we are committed to protecting your personal
            information. This policy explains how we collect, use, and secure
            your data when you browse our catalogue, create an account, or place
            an order.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Information We Collect
          </h2>
          <p className="text-slate-600">
            We collect personal details that you provide directly, such as your
            name, email, phone number, shipping address, GST details (for
            business customers), and payment preferences. We also collect
            limited device and usage data to improve performance and diagnose
            issues.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            How We Use Your Information
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-600">
            <li>Process and fulfil your orders, returns, and refunds.</li>
            <li>
              Provide tailored product recommendations and personalised offers.
            </li>
            <li>
              Communicate important updates regarding your shipments and support
              requests.
            </li>
            <li>Comply with taxation, accounting, and legal obligations.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">
            Data Protection & Sharing
          </h2>
          <p className="text-slate-600">
            We secure your information using industry-standard encryption and
            access controls. We only share data with trusted logistics partners,
            payment gateways, and service providers who help us deliver your
            orders. They are bound by confidentiality and data-processing
            agreements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Your Choices</h2>
          <p className="text-slate-600">
            You can update or delete your MegaMart account details any time from
            the My Profile section. To unsubscribe from marketing emails, use
            the link in the email footer. For data access or deletion requests,
            please reach out to{" "}
            <a
              href="mailto:megamart@edihub.in"
              className="text-primary underline"
            >
              megamart@edihub.in
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-secondary">Contact Us</h2>
          <p className="text-slate-600">
            If you have any questions about this Privacy Policy or how MegaMart
            handles your data, write to us at{" "}
            <a
              href="mailto:megamart@edihub.in"
              className="text-primary underline"
            >
              megamart@edihub.in
            </a>{" "}
            or call our helpline at +1 202-918-2132.
          </p>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
