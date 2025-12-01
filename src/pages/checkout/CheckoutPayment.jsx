import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  setCheckoutStep,
  setPaymentMethod,
  setPaymentStatus,
  setOrderId,
  setCheckoutTotals,
  resetCheckout,
} from "../../store/slices/checkoutSlice";
import {
  createOrder,
  createPhonePePayment,
  fetchPaymentStatus,
} from "../../utils/api";
import { useCart } from "../../contexts/CartContext";
import { toast } from "react-hot-toast";
import QRCode from "react-qr-code";

const POLLING_INTERVAL_MS = 3500;
const MAX_POLL_ATTEMPTS = 40;
const isMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 768px)").matches;

const paymentOptions = [
  {
    id: "upi",
    title: "PhonePe / UPI",
    description: "Pay instantly using any UPI app linked to PhonePe.",
  },
  {
    id: "qr",
    title: "PhonePe QR Code",
    description: "Scan and pay securely with the official PhonePe QR.",
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    description: "Pay in cash when the product is delivered to you.",
  },
];

const formatCurrency = (value = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const CheckoutPayment = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    items,
    shippingAddress,
    totals,
    orderId: checkoutOrderId,
  } = useSelector((state) => state.checkout);
  const { removeItems } = useCart();
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [pollingError, setPollingError] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);

  const pollingAttemptsRef = useRef(0);
  const pollingTimerRef = useRef(null);

  useEffect(() => {
    if (!items.length) {
      if (checkoutOrderId) {
        return;
      }
      navigate("/cart", { replace: true });
      return;
    }
    if (!shippingAddress) {
      navigate("/checkout/address", { replace: true });
      return;
    }
    dispatch(setCheckoutStep("payment"));
  }, [dispatch, items.length, shippingAddress, checkoutOrderId, navigate]);

  const orderItems = useMemo(
    () =>
      items.map(
        ({
          product,
          name,
          image,
          price,
          quantity,
          size,
          hsnCode,
          hsn,
          gstRate,
          taxRate,
        }) => ({
          product,
          name,
          image,
          price,
          quantity,
          size,
          hsnCode: hsnCode || hsn || undefined,
          gstRate:
            gstRate !== undefined && gstRate !== null
              ? Number(gstRate)
              : taxRate !== undefined && taxRate !== null
              ? Number(taxRate)
              : undefined,
        })
      ),
    [items]
  );

  const fallbackSubtotal = useMemo(
    () =>
      orderItems.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [orderItems]
  );

  const resolvedTotals = useMemo(() => {
    const normaliseNumber = (value, fallback = 0) =>
      Number.isFinite(Number(value)) ? Number(value) : fallback;

    const shippingFee = normaliseNumber(totals.shippingFee, 0);
    const taxAmount = normaliseNumber(totals.taxAmount, 0);
    const discount = normaliseNumber(totals.discount, 0);
    const subtotal = totals.subtotal > 0 ? totals.subtotal : fallbackSubtotal;
    const totalCandidate =
      totals.total > 0
        ? totals.total
        : subtotal + shippingFee + taxAmount - discount;
    const total = Math.max(
      Number.isFinite(totalCandidate) ? totalCandidate : 0,
      0
    );
    const currency = totals.currency || "INR";

    return {
      subtotal,
      shippingFee,
      taxAmount,
      discount,
      total,
      currency,
    };
  }, [fallbackSubtotal, totals]);

  const pricingPayload = useMemo(
    () => ({
      shippingFee: resolvedTotals.shippingFee,
      taxAmount: resolvedTotals.taxAmount,
      discount: resolvedTotals.discount,
      currency: resolvedTotals.currency,
    }),
    [resolvedTotals]
  );

  const sanitizedAddress = useMemo(() => {
    if (!shippingAddress) return null;
    return {
      fullName: shippingAddress.fullName,
      mobile: shippingAddress.mobile,
      email: shippingAddress.email,
      pincode: shippingAddress.pincode,
      state: shippingAddress.state,
      city: shippingAddress.city,
      addressLine: shippingAddress.addressLine,
      alternatePhone: shippingAddress.alternatePhone || "",
    };
  }, [shippingAddress]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const handlePaymentSuccess = useCallback(
    (transactionId, statusData) => {
      const order = statusData?.order || null;
      const orderId = order?._id || statusData?.orderId;

      dispatch(setPaymentStatus("paid"));
      if (orderId) {
        dispatch(setOrderId(orderId));
      }

      const itemsToRemove =
        Array.isArray(order?.items) && order.items.length
          ? order.items
          : orderItems;
      removeItems(itemsToRemove);

      toast.success("Payment Success ✅");
      stopPolling();
      setIsAwaitingConfirmation(false);
      setPaymentSession((session) =>
        session
          ? { ...session, paymentStatus: "SUCCESS", completedAt: new Date() }
          : session
      );

      navigate("/checkout/payment-success", {
        replace: true,
        state: {
          order,
          orderId,
          transactionId,
          amountPaid: statusData?.amountInRupees,
        },
      });

      dispatch(resetCheckout());
    },
    [dispatch, navigate, orderItems, removeItems, stopPolling]
  );

  const handlePaymentFailure = useCallback(
    (transactionId, message, statusData) => {
      dispatch(setPaymentStatus("failed"));
      toast.error(message || "Payment Failed ❌");
      stopPolling();
      setIsAwaitingConfirmation(false);
      setPaymentSession((session) =>
        session ? { ...session, paymentStatus: "FAILED" } : session
      );

      navigate("/checkout/payment-failed", {
        replace: true,
        metadata: {
          initiationMessage: phonePeResponse.message,
        },
        state: {
          transactionId,
          message:
            message ||
            "We couldn't confirm your payment. Please try again or choose another method.",
          gateway: statusData?.gateway,
        },
      });
    },
    [dispatch, navigate, stopPolling]
  );

  const startPolling = useCallback(
    (transactionId) => {
      pollingAttemptsRef.current = 0;
      setPollingError(null);

      const poll = async () => {
        pollingAttemptsRef.current += 1;

        try {
          const response = await fetchPaymentStatus(transactionId);
          const statusData = response?.data;

          if (!statusData) {
            throw new Error("No payment status returned by server");
          }

          const normalizedStatus = String(
            statusData.paymentStatus || ""
          ).toUpperCase();

          if (normalizedStatus === "SUCCESS") {
            handlePaymentSuccess(transactionId, statusData);
            return;
          }

          if (normalizedStatus === "FAILED") {
            handlePaymentFailure(
              transactionId,
              statusData.gateway?.message || statusData.gatewayError?.message,
              statusData,
              response
            );
            return;
          }

          setPaymentSession((session) =>
            session
              ? {
                  ...session,
                  qrData: statusData.qrData || session.qrData,
                  redirectUrl: statusData.redirectUrl || session.redirectUrl,
                }
              : session
          );

          if (pollingAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
            setIsAwaitingConfirmation(false);
            setPollingError(
              "Payment is still pending. Please confirm the status in the PhonePe app."
            );
            toast(
              "Payment pending. You can retry once in PhonePe is complete.",
              {
                icon: "⏳",
              }
            );
            return;
          }

          pollingTimerRef.current = setTimeout(poll, POLLING_INTERVAL_MS);
        } catch (error) {
          console.error("pollPaymentStatus error", error);

          if (pollingAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
            setIsAwaitingConfirmation(false);
            setPollingError(
              error.message ||
                "Unable to confirm payment right now. Please check the PhonePe app."
            );
            toast.error(
              "Could not verify payment. Please check and try again."
            );
            return;
          }

          pollingTimerRef.current = setTimeout(
            poll,
            Math.round(POLLING_INTERVAL_MS * 1.5)
          );
        }
      };

      setIsAwaitingConfirmation(true);
      stopPolling();
      poll();
    },
    [handlePaymentFailure, handlePaymentSuccess, stopPolling]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (selectedMethod === "cod") {
      setPaymentSession(null);
      setIsAwaitingConfirmation(false);
      setPollingError(null);
      stopPolling();
    }
  }, [selectedMethod, stopPolling]);

  useEffect(() => {
    if (
      resolvedTotals.total > 0 &&
      (Math.abs((totals?.total || 0) - resolvedTotals.total) > 0.01 ||
        Math.abs((totals?.subtotal || 0) - resolvedTotals.subtotal) > 0.01)
    ) {
      dispatch(setCheckoutTotals(resolvedTotals));
    }
  }, [dispatch, resolvedTotals, totals]);

  const placeCodOrder = useCallback(async () => {
    if (!sanitizedAddress) return;

    const payload = {
      items: orderItems,
      pricing: {
        ...pricingPayload,
      },
      shippingAddress: sanitizedAddress,
      payment: {
        method: "cod",
        status: "pending",
      },
    };

    const response = await createOrder(payload);
    const orderData = response?.data;
    const orderId = orderData?._id;

    dispatch(setPaymentStatus("pending"));
    dispatch(setOrderId(orderId));

    removeItems(Array.isArray(orderData?.items) ? orderData.items : orderItems);

    toast.success("Order placed successfully");
    navigate("/", {
      replace: true,
      state: {
        recentOrderId: orderId,
      },
    });

    dispatch(resetCheckout());
  }, [
    dispatch,
    navigate,
    orderItems,
    pricingPayload,
    resolvedTotals.subtotal,
    resolvedTotals.total,
    sanitizedAddress,
    removeItems,
  ]);

  const handleManualRefresh = useCallback(() => {
    if (!paymentSession?.merchantTransactionId) {
      toast.error("Transaction ID not available yet");
      return;
    }
    startPolling(paymentSession.merchantTransactionId);
  }, [paymentSession, startPolling]);

  const handleOpenRedirect = useCallback((url) => {
    if (!url || typeof window === "undefined") {
      return;
    }
    try {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to open redirect url", error);
      window.location.href = url;
    }
  }, []);

  const handleCopyTransactionId = useCallback(async (transactionId) => {
    if (!transactionId || typeof navigator === "undefined") {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(transactionId);
        toast.success("Transaction ID copied");
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (error) {
      console.error("Failed to copy transaction id", error);
      toast.error("Unable to copy transaction ID");
    }
  }, []);

  const handlePlaceOrder = async () => {
    if (!sanitizedAddress) {
      toast.error("Please provide a delivery address first");
      navigate("/checkout/address");
      return;
    }

    if (!orderItems.length) {
      toast.error("Your cart is empty");
      navigate("/cart");
      return;
    }

    if (!(resolvedTotals.total > 0)) {
      toast.error("Order total must be greater than zero before paying");
      return;
    }

    dispatch(setPaymentMethod(selectedMethod));

    if (selectedMethod === "cod") {
      try {
        setIsProcessing(true);
        await placeCodOrder();
      } catch (error) {
        console.error("Failed to place COD order", error);
        const message =
          error.response?.data?.message ||
          error.message ||
          "Failed to place order";
        toast.error(message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      setIsProcessing(true);
      setPollingError(null);

      const paymentPayload = {
        paymentMethod: selectedMethod,
        items: orderItems,
        pricing: {
          ...pricingPayload,
          subtotal: resolvedTotals.subtotal,
          total: resolvedTotals.total,
        },
        shippingAddress: sanitizedAddress,
        paymentInstrument: { type: "PAY_PAGE" },
        metadata: {
          checkoutSubtotal: resolvedTotals.subtotal,
          checkoutTotal: resolvedTotals.total,
        },
      };

      const response = await createPhonePePayment(paymentPayload);

      if (!response?.success || !response?.data?.merchantTransactionId) {
        throw new Error(
          response?.message || "Failed to initiate PhonePe payment"
        );
      }

      const data = response.data;

      toast.success("Payment Initiated 🚀");

      setPaymentSession({
        merchantTransactionId: data.merchantTransactionId,
        amountInRupees: data.amountInRupees,
        qrData: data.qrData,
        redirectUrl: data.redirectUrl,
        paymentStatus: data.paymentStatus,
        initiatedAt: new Date(),
      });

      dispatch(setPaymentStatus("pending"));

      if (data.redirectUrl && isMobileViewport()) {
        setTimeout(() => {
          window.location.assign(data.redirectUrl);
        }, 400);
      }

      startPolling(data.merchantTransactionId);
    } catch (error) {
      console.error("PhonePe payment initiation failed", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to initiate payment";
      toast.error(message);
      setIsAwaitingConfirmation(false);
      setPaymentSession(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentSessionStatus = paymentSession
    ? String(paymentSession.paymentStatus || "PENDING").toUpperCase()
    : "PENDING";

  const paymentStatusBadgeClass =
    paymentSessionStatus === "SUCCESS"
      ? "bg-emerald-100 text-emerald-700"
      : paymentSessionStatus === "FAILED"
      ? "bg-rose-100 text-rose-600"
      : "bg-amber-100 text-amber-700";

  return (
    <>
      <div className="min-h-[calc(100vh-180px)] bg-light-bg">
        <div className="mx-auto grid w-full max-w-6xl gap-6 p-6 lg:grid-cols-[2fr,1fr] lg:p-10">
          <div className="space-y-6">
            <motion.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Secure Payment
                </p>
                <h2 className="text-2xl font-semibold text-secondary">
                  Choose how you want to pay
                </h2>
                <p className="mt-1 text-sm text-medium-text">
                  Scan the PhonePe QR or pay via UPI for instant confirmation.
                </p>
              </div>
              <span className="inline-flex w-max items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                Step 3 of 4
              </span>
            </motion.header>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-secondary">
                    Delivering to
                  </h3>
                  <p className="mt-1 text-sm text-medium-text">
                    Review your address before completing the payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/checkout/address")}
                  className="rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/5"
                >
                  Change address
                </button>
              </div>
              {sanitizedAddress && (
                <div className="mt-4 grid gap-3 text-sm text-secondary sm:grid-cols-2">
                  <div>
                    <p className="font-medium">{sanitizedAddress.fullName}</p>
                    <p className="text-medium-text">
                      {sanitizedAddress.mobile}
                    </p>
                    {sanitizedAddress.email && (
                      <p className="text-medium-text">
                        {sanitizedAddress.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <p>{sanitizedAddress.addressLine}</p>
                    <p>
                      {sanitizedAddress.city}, {sanitizedAddress.state} -{" "}
                      {sanitizedAddress.pincode}
                    </p>
                    {sanitizedAddress.alternatePhone && (
                      <p className="text-medium-text">
                        Alt: {sanitizedAddress.alternatePhone}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-secondary">
                Payment options
              </h3>
              <div className="mt-4 grid gap-3">
                {paymentOptions.map((option) => {
                  const isActive = selectedMethod === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedMethod(option.id)}
                      className={`flex items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                          : "border-slate-200 hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isActive
                            ? "border-primary bg-primary"
                            : "border-slate-300"
                        }`}
                      >
                        {isActive && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </span>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-secondary">
                          {option.title}
                        </p>
                        <p className="text-sm text-medium-text">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <AnimatePresence mode="wait">
              {selectedMethod !== "cod" && (
                <motion.section
                  key={
                    paymentSession ? "phonepe-session" : "phonepe-instructions"
                  }
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  {paymentSession ? (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-secondary">
                          Complete your PhonePe payment
                        </h3>
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusBadgeClass}`}
                        >
                          {paymentSessionStatus}
                        </span>
                      </div>
                      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
                        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6">
                          {paymentSession.qrData ? (
                            <>
                              <QRCode
                                value={paymentSession.qrData}
                                size={220}
                                includeMargin
                                renderAs="svg"
                              />
                              <p className="text-sm font-medium text-secondary">
                                Scan using the PhonePe app to pay{" "}
                                {formatCurrency(
                                  paymentSession.amountInRupees,
                                  resolvedTotals.currency
                                )}
                              </p>
                            </>
                          ) : (
                            <p className="text-center text-sm text-medium-text">
                              Generating QR code… follow the redirect link below
                              to continue in the PhonePe app.
                            </p>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-secondary">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                Transaction ID
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyTransactionId(
                                    paymentSession.merchantTransactionId
                                  )
                                }
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="mt-1 break-all font-mono text-xs text-medium-text">
                              {paymentSession.merchantTransactionId}
                            </p>
                            <p className="mt-3 flex items-center justify-between text-sm">
                              <span>Amount</span>
                              <span className="font-semibold text-secondary">
                                {formatCurrency(
                                  paymentSession.amountInRupees,
                                  resolvedTotals.currency
                                )}
                              </span>
                            </p>
                            {paymentSession.initiatedAt && (
                              <p className="mt-1 text-xs text-medium-text">
                                Initiated at{" "}
                                {paymentSession.initiatedAt.toLocaleTimeString?.(
                                  "en-IN",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            )}
                          </div>

                          {paymentSession.redirectUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenRedirect(paymentSession.redirectUrl)
                              }
                              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow hover:bg-primary-dark"
                            >
                              Open PhonePe payment page
                            </button>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleManualRefresh}
                              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-secondary transition hover:border-primary/60 hover:text-primary"
                            >
                              Refresh status
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentSession(null)}
                              className="rounded-xl border border-transparent px-4 py-2 text-sm text-medium-text underline-offset-4 hover:text-primary hover:underline"
                            >
                              Try a different method
                            </button>
                          </div>

                          {pollingError && (
                            <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-700">
                              {pollingError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-sm text-medium-text">
                      <h3 className="text-base font-semibold text-secondary">
                        How PhonePe checkout works
                      </h3>
                      <ol className="list-decimal space-y-2 pl-5">
                        <li>
                          Click “Pay &amp; Place Order” to create a secure
                          PhonePe transaction.
                        </li>
                        <li>
                          Scan the QR on desktop or continue in the PhonePe app
                          on mobile.
                        </li>
                        <li>
                          We’ll automatically confirm your payment and place the
                          order.
                        </li>
                      </ol>
                      <p className="text-xs text-slate-500">
                        Need to change the payment option? You can always switch
                        back to Cash on Delivery.
                      </p>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => navigate("/checkout/address")}
                className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-secondary transition hover:border-primary/50 hover:bg-primary/5 sm:w-auto"
              >
                Back to Address
              </button>
              <motion.button
                whileHover={{
                  scale: isProcessing || isAwaitingConfirmation ? 1 : 1.02,
                }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlaceOrder}
                disabled={isProcessing || isAwaitingConfirmation}
                className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary-dark sm:w-auto"
              >
                {isProcessing
                  ? selectedMethod === "cod"
                    ? "Placing Order..."
                    : "Contacting PhonePe..."
                  : selectedMethod === "cod"
                  ? "Place Order"
                  : paymentSession
                  ? "Regenerate Payment"
                  : "Pay & Place Order"}
              </motion.button>
            </div>
          </div>

          <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-10 lg:h-max">
            <div>
              <h3 className="text-lg font-semibold text-secondary">
                Order Summary
              </h3>
              <div className="mt-4 space-y-3 text-sm text-medium-text">
                {items.map((item) => (
                  <div
                    key={`${item.product || item.id}-${item.size || "default"}`}
                    className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-secondary">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        Qty: {item.quantity}
                      </span>
                    </div>
                    {item.size && (
                      <span className="text-xs text-slate-500">
                        Size: {item.size}
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>HSN: {item?.hsnCode ? item.hsnCode : "--"}</span>
                      <span className="text-slate-300">|</span>
                      <span>
                        GST:{" "}
                        {Number.isFinite(Number(item?.gstRate))
                          ? `${Number(item.gstRate)
                              .toFixed(2)
                              .replace(/\.00$/, "")}%`
                          : "--"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Unit Price: ₹{item.price?.toLocaleString?.() || 0}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(
                      resolvedTotals.subtotal,
                      resolvedTotals.currency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping Fee</span>
                  <span>
                    {formatCurrency(
                      resolvedTotals.shippingFee,
                      resolvedTotals.currency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>
                    {formatCurrency(
                      resolvedTotals.taxAmount,
                      resolvedTotals.currency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-success font-medium">
                  <span>Discount</span>
                  <span>
                    -
                    {formatCurrency(
                      resolvedTotals.discount,
                      resolvedTotals.currency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-secondary">
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      resolvedTotals.total,
                      resolvedTotals.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-primary/5 p-4 text-sm text-medium-text">
              All card and UPI transactions on MegaMart are 100% secure and
              encrypted.
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {isAwaitingConfirmation && (
          <motion.div
            key="phonepe-wait-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl"
            >
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <h3 className="text-lg font-semibold text-secondary">
                Waiting for PhonePe confirmation…
              </h3>
              <p className="mt-2 text-sm text-medium-text">
                Complete the payment in the PhonePe app. We’ll place your order
                as soon as it is confirmed.
              </p>
              {paymentSession?.merchantTransactionId && (
                <p className="mt-4 truncate text-xs font-mono text-slate-500">
                  Txn ID: {paymentSession.merchantTransactionId}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CheckoutPayment;
