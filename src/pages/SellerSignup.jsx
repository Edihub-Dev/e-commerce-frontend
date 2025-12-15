import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Clock, MailCheck } from "lucide-react";
import { toast } from "react-toastify";
import { sellerSignupSchema } from "../utils/validators";
import { applyForSeller } from "../utils/api";
import { pageVariants, scaleIn, buttonHover } from "../utils/animations";

const initialState = {
  fullName: "",
  companyName: "",
  companyEmail: "",
  gstNumber: "",
  location: "",
  password: "",
  confirmPassword: "",
};

const PENDING_STORAGE_KEY = "sellerApplicationPending";

const normalizeString = (value = "") => value.trim();
const normalizeEmail = (value = "") => value.trim().toLowerCase();
const maskEmail = (value = "") => {
  const email = value.trim();
  if (!email) return "";
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return `${local.slice(0, 1)}***`;
  const maskedLocal =
    local.length <= 2
      ? `${local[0] || "*"}***`
      : `${local[0]}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
};

const SellerSignup = () => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewCard, setShowReviewCard] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [pendingDetails, setPendingDetails] = useState(null);

  const companyEmailRef = useRef(null);
  const locationRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PENDING_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.companyEmail &&
        parsed.companyName
      ) {
        setPendingDetails({
          fullName: parsed.fullName || "",
          companyName: parsed.companyName,
          companyEmail: parsed.companyEmail,
          location: parsed.location || "",
          gstNumber: parsed.gstNumber || "",
          submittedAt: parsed.submittedAt,
        });
      }
    } catch (error) {
      console.warn("Failed to restore seller application state", error);
      localStorage.removeItem(PENDING_STORAGE_KEY);
    }
  }, []);

  const clearPendingApplication = () => {
    localStorage.removeItem(PENDING_STORAGE_KEY);
    setPendingDetails(null);
    setSubmissionDetails(null);
    setShowReviewCard(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFieldKeyDown = (event, nextRef) => {
    if (event.key === "Enter") {
      event.preventDefault();
      nextRef?.current?.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { error } = sellerSignupSchema.validate(formData, {
      abortEarly: false,
    });

    if (error) {
      const validationErrors = {};
      error.details.forEach((detail) => {
        validationErrors[detail.path[0]] = detail.message;
      });
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const normalizedPayload = {
        fullName: normalizeString(formData.fullName),
        companyName: normalizeString(formData.companyName),
        companyEmail: normalizeEmail(formData.companyEmail),
        gstNumber: normalizeString(formData.gstNumber),
        location: normalizeString(formData.location),
      };

      const pendingMatch =
        pendingDetails &&
        normalizeEmail(pendingDetails.companyEmail) ===
          normalizedPayload.companyEmail &&
        normalizeString(pendingDetails.companyName) ===
          normalizedPayload.companyName &&
        normalizeString(pendingDetails.fullName) === normalizedPayload.fullName;

      if (pendingMatch) {
        setSubmissionDetails({
          fullName: pendingDetails.fullName,
          companyName: pendingDetails.companyName,
          companyEmail: pendingDetails.companyEmail,
        });
        setShowReviewCard(true);
        toast.info(
          "This seller application is already in review. We'll notify you after approval.",
          { autoClose: 2500 }
        );
        return;
      }

      await applyForSeller({
        fullName: formData.fullName,
        companyName: formData.companyName,
        companyEmail: formData.companyEmail,
        gstNumber: formData.gstNumber,
        location: formData.location,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      toast.success(
        "Application submitted. We'll email you once it's reviewed.",
        { autoClose: 2000 }
      );

      const latestDetails = {
        fullName: normalizedPayload.fullName,
        companyName: normalizedPayload.companyName,
        companyEmail: normalizedPayload.companyEmail,
        gstNumber: normalizedPayload.gstNumber,
        location: normalizedPayload.location,
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(latestDetails));
      setPendingDetails(latestDetails);
      setSubmissionDetails({
        fullName: latestDetails.fullName,
        companyName: latestDetails.companyName,
        companyEmail: latestDetails.companyEmail,
      });
      setFormData(initialState);
      setShowReviewCard(true);
    } catch (submitError) {
      const message = submitError?.message || "Failed to submit application.";
      toast.error(message, { autoClose: 2500 });
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingApplication = Boolean(pendingDetails);
  const normalizedCompanyEmail = normalizeEmail(formData.companyEmail);
  const pendingEmail = normalizeEmail(pendingDetails?.companyEmail);
  const matchesPendingEmail =
    hasPendingApplication &&
    normalizedCompanyEmail &&
    normalizedCompanyEmail === pendingEmail;

  return (
    <motion.div
      className="container mx-auto px-4 py-16 flex justify-center"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md border"
        variants={scaleIn}
        initial="initial"
        animate="animate"
      >
        {showReviewCard && submissionDetails ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Application under review</h1>
              <p className="text-sm text-gray-600">
                Thanks {submissionDetails.fullName || "there"}! We've received
                the seller request for{" "}
                <strong>{submissionDetails.companyName}</strong>. Our team will
                review your details and email{" "}
                <span className="font-medium text-gray-800">
                  {submissionDetails.companyEmail}
                </span>{" "}
                once approval is complete. Please wait patiently for our team to
                review your application—this may take a little time.
              </p>
            </div>
            <div className="grid gap-4 w-full max-w-md">
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary-900">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-0.5 text-primary" size={20} />
                  <div className="text-left">
                    <p className="font-semibold text-primary">
                      What happens next?
                    </p>
                    <p className="text-gray-600">
                      An approval link has been emailed to our admin team. We'll
                      notify you as soon as your seller dashboard is activated.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Need to update your application? Reply to the confirmation email
                or contact support with your company details.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={clearPendingApplication}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  Submit another application
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Return to home
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold">Become a Seller</h1>
              <p className="text-sm text-gray-600">
                Share your products with the p2pdeal community. Submit your
                details and our team will review your application.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onKeyDown={(event) =>
                      handleFieldKeyDown(event, companyEmailRef)
                    }
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                      errors.fullName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                      errors.companyName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Registered business name"
                    autoComplete="organization"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.companyName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="companyEmail"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company Email
                  </label>
                  <input
                    type="email"
                    id="companyEmail"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    ref={companyEmailRef}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                      errors.companyEmail ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="contact@yourcompany.com"
                    autoComplete="email"
                  />
                  {errors.companyEmail && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.companyEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="gstNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Company GST Number (optional)
                  </label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                      errors.gstNumber ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="15-character GSTIN"
                    maxLength={15}
                  />
                  {errors.gstNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.gstNumber}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    ref={locationRef}
                    onKeyDown={(event) =>
                      handleFieldKeyDown(event, passwordRef)
                    }
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                      errors.location ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="City, State"
                    autoComplete="address-level2"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.location}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      ref={passwordRef}
                      onKeyDown={(event) =>
                        handleFieldKeyDown(event, confirmPasswordRef)
                      }
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                        errors.password ? "border-red-500" : "border-gray-300"
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      ref={confirmPasswordRef}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <motion.button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                variants={buttonHover}
                whileHover="hover"
                whileTap="tap"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </motion.button>
            </form>

            <p className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <Link to="/" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SellerSignup;
