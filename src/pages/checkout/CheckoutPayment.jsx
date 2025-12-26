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
  clearAppliedCoupon,
} from "../../store/slices/checkoutSlice";
import {
  createOrder,
  createPhonePePayment,
  fetchPaymentStatus,
} from "../../utils/api";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import QRCode from "react-qr-code";
import { resetCouponState } from "../../store/slices/couponSlice";

const POLLING_INTERVAL_MS = 3500;
const MAX_POLL_ATTEMPTS = 40;
const isMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 768px)").matches;

const paymentOptions = [
  // {
  //   id: "upi",
  //   title: "PhonePe / UPI",
  //   description: "Pay instantly using any UPI app linked to PhonePe.",
  // },
  // {
  //   id: "qr",
  //   title: "PhonePe QR Code",
  //   description: "Scan and pay securely with the official PhonePe QR.",
  // },
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
  const { user } = useAuth();
  const {
    items,
    shippingAddress,
    totals,
    orderId: checkoutOrderId,
    appliedCoupon,
    qrfolioUpload,
  } = useSelector((state) => state.checkout);
  const { clearCart } = useCart();
  const [selectedMethod, setSelectedMethod] = useState("cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [pollingError, setPollingError] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setIsMobile(isMobileViewport());
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const orderItems = useMemo(() => {
    const mongoIdRegex = /^[a-f\d]{24}$/i;

    const extractProductId = (sourceItem) => {
      if (!sourceItem || typeof sourceItem !== "object") {
        return undefined;
      }

      const visited = new Set();
      const queue = [
        sourceItem.product,
        sourceItem.mongoId,
        sourceItem._id,
        sourceItem.id,
        sourceItem.slug,
        sourceItem.productId,
      ];

      while (queue.length) {
        const current = queue.shift();

        if (current === undefined || current === null) {
          continue;
        }

        if (typeof current === "string" || typeof current === "number") {
          const normalized = String(current).trim();
          if (mongoIdRegex.test(normalized)) {
            return normalized;
          }
          continue;
        }

        if (typeof current === "object") {
          if (visited.has(current)) {
            continue;
          }
          visited.add(current);

          if (
            typeof current.$oid === "string" &&
            mongoIdRegex.test(current.$oid)
          ) {
            return current.$oid.trim();
          }

          if (typeof current.toHexString === "function") {
            const hex = current.toHexString();
            if (mongoIdRegex.test(hex)) {
              return hex;
            }
          }

          const additionalCandidates = [
            current._id,
            current.mongoId,
            current.id,
            current.product,
            current.slug,
            current.$id,
          ];

          queue.push(
            ...additionalCandidates.filter(
              (candidate) => candidate !== undefined
            )
          );

          if (
            current.toString &&
            current.toString !== Object.prototype.toString &&
            typeof current.toString === "function"
          ) {
            const toStringValue = current.toString();
            if (
              typeof toStringValue === "string" &&
              mongoIdRegex.test(toStringValue.trim())
            ) {
              return toStringValue.trim();
            }
          }
        }
      }

      return undefined;
    };

    return items
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const {
          name,
          image,
          price,
          quantity,
          size,
          hsnCode,
          hsn,
          gstRate,
          taxRate,
        } = item;

        const resolvedProductId = extractProductId(item);

        return {
          product: resolvedProductId,
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
        };
      })
      .filter(Boolean);
  }, [items]);

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
      baseSubtotal: fallbackSubtotal,
    }),
    [fallbackSubtotal, resolvedTotals]
  );

  const sanitizedAddress = useMemo(() => {
    if (!shippingAddress) return null;
    const normalizedEmail =
      (shippingAddress.email && shippingAddress.email.trim()) ||
      (user?.email && user.email.trim()) ||
      "";

    return {
      fullName: shippingAddress.fullName,
      mobile: shippingAddress.mobile,
      email: normalizedEmail,
      pincode: shippingAddress.pincode,
      state: shippingAddress.state,
      city: shippingAddress.city,
      addressLine: shippingAddress.addressLine,
      alternatePhone: shippingAddress.alternatePhone || "",
    };
  }, [shippingAddress, user?.email]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const handleSelectPaymentOption = useCallback(
    (methodId) => {
      if (methodId === selectedMethod) {
        return;
      }

      if (methodId !== "cod") {
        stopPolling();
        setPaymentSession(null);
        setIsAwaitingConfirmation(false);
        setPollingError(null);
      }

      setSelectedMethod(methodId);
    },
    [selectedMethod, stopPolling]
  );

  const handlePaymentSuccess = useCallback(
    (transactionId, statusData) => {
      const order = statusData?.order || null;
      const orderId = order?._id || statusData?.orderId;

      dispatch(setPaymentStatus("paid"));
      if (orderId) {
        dispatch(setOrderId(orderId));
      }

      clearCart();

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
      dispatch(clearAppliedCoupon());
      dispatch(resetCouponState());
    },
    [dispatch, navigate, stopPolling]
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
    if (!sanitizedAddress) {
      return;
    }

    const missingProductIndex = orderItems.findIndex((item) => !item?.product);

    if (missingProductIndex !== -1) {
      const rawItem = items?.[missingProductIndex];
      const normalizedItem = orderItems[missingProductIndex];

      console.error("Checkout item missing product reference", {
        itemIndex: missingProductIndex,
        rawItem,
        normalizedItem,
      });

      toast.error(
        `Cart item #${
          missingProductIndex + 1
        } is outdated. Please remove it and add the product again.`,
        { duration: 4000 }
      );
      throw new Error("Checkout item missing product reference");
    }

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
      ...(appliedCoupon?.code
        ? {
            coupon: {
              code: appliedCoupon.code,
            },
          }
        : {}),
      ...(qrfolioUpload
        ? {
            qrfolio: {
              image: qrfolioUpload.dataUrl || undefined,
              imageUrl: qrfolioUpload.imageUrl || undefined,
            },
          }
        : {}),
    };

    const response = await createOrder(payload);
    const orderData = response?.data;
    const createdOrderId = orderData?._id;

    dispatch(setPaymentStatus("pending"));
    if (createdOrderId) {
      dispatch(setOrderId(createdOrderId));
    }

    clearCart();

    toast.success("Order placed successfully");
    navigate("/", {
      replace: true,
      state: {
        recentOrderId: createdOrderId,
      },
    });

    dispatch(resetCheckout());
  }, [
    appliedCoupon?.code,
    dispatch,
    items,
    navigate,
    orderItems,
    pricingPayload,
    sanitizedAddress,
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

    const violatingItem = items.find((item) => {
      if (!item?.isSellerProduct) {
        return false;
      }

      const rawLimit = Number(item?.maxPurchaseQuantity ?? 0);
      if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
        return false;
      }
      const limit = Math.floor(rawLimit);
      return Number(item.quantity || 0) > limit;
    });

    if (violatingItem) {
      const rawLimit = Number(violatingItem.maxPurchaseQuantity || 0);
      const limit = Math.max(1, Math.floor(rawLimit || 0));
      toast.error(
        `You can only buy up to ${limit} unit${limit === 1 ? "" : "s"} of ${
          violatingItem.name
        } per order.`
      );
      return;
    }

    if (!(resolvedTotals.total > 0) && selectedMethod !== "cod") {
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
          ...(qrfolioUpload
            ? {
                qrfolio: {
                  image: qrfolioUpload.dataUrl || undefined,
                  imageUrl: qrfolioUpload.imageUrl || undefined,
                },
              }
            : {}),
        },
        ...(appliedCoupon?.code
          ? {
              coupon: {
                code: appliedCoupon.code,
              },
            }
          : {}),
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

  const couponDiscountAmount = appliedCoupon?.discountAmount || 0;
  const displayedDiscount =
    resolvedTotals.discount > 0
      ? resolvedTotals.discount
      : couponDiscountAmount;

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
        <div className="mx-auto w-full max-w-6xl p-6 lg:p-10">
          <div className="space-y-6">
            {!isMobile && (
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
            )}

            {!isMobile && (
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
            )}

            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.1fr,0.9fr]">
              <aside className="order-1 lg:order-2 lg:sticky lg:top-10 lg:h-max">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="text-lg font-semibold text-secondary">
                      Order Summary
                    </h3>
                    {appliedCoupon?.code && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                        Coupon {appliedCoupon.code}
                      </span>
                    )}
                  </div>

                  <div className="space-y-5 px-5 pb-5 pt-4 text-sm text-medium-text">
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={`${item.product || item.id}-${
                            item.size || "default"
                          }`}
                          className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
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
                            <span className="mt-1 text-xs uppercase text-slate-500">
                              Size: {item.size}
                            </span>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>
                              HSN: {item?.hsnCode ? item.hsnCode : "--"}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span>
                              GST:{" "}
                              {Number.isFinite(Number(item?.gstRate))
                                ? `${Number(item.gstRate)
                                    .toFixed(2)
                                    .replace(/\.00$/, "")} %`
                                : "--"}
                            </span>
                          </div>
                          <span className="mt-2 block text-xs text-slate-500">
                            Unit Price: ₹{item.price?.toLocaleString?.() || 0}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
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
                      <div className="flex items-center justify-between font-semibold text-emerald-600">
                        <span>Discount</span>
                        <span>
                          -
                          {formatCurrency(
                            displayedDiscount > 0 ? displayedDiscount : 0,
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

                    <div className="rounded-xl bg-primary/5 px-4 py-3 text-xs text-medium-text">
                      All card and UPI transactions on p2pdeal are 100% secure
                      and encrypted.
                    </div>
                  </div>
                </div>
              </aside>

              <div className="order-2 space-y-6 lg:order-1">
                {!isMobile && (
                  <header className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold text-secondary">
                        Choose your payment method
                      </h2>
                      <p className="text-sm text-medium-text">
                        Select a secure payment option to complete your order.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/5 px-4 py-2 text-sm text-primary">
                      Total payable:{" "}
                      {formatCurrency(
                        resolvedTotals.total,
                        resolvedTotals.currency
                      )}
                    </div>
                  </header>
                )}

                <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-secondary">
                        Payment Options
                      </p>
                      <p className="text-xs text-medium-text">
                        All transactions are secure and encrypted. Select your
                        preferred method below.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {paymentOptions.map((option) => {
                        const isSelected = selectedMethod === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectPaymentOption(option.id)}
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-slate-200 bg-white text-secondary hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold">
                                  {option.title}
                                </p>
                                <p className="text-xs text-medium-text">
                                  {option.description}
                                </p>
                              </div>
                              <span
                                className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition ${
                                  isSelected
                                    ? "border-primary bg-primary text-white"
                                    : "border-slate-300 text-slate-400"
                                }`}
                              >
                                {isSelected ? "" : ""}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <AnimatePresence>
                  {paymentSession ? (
                    <motion.section
                      key="phonepe-session"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
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
                                Generating QR code… follow the redirect link
                                below to continue in the PhonePe app.
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
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
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
                    </motion.section>
                  ) : (
                    !isMobile && (
                      <motion.section
                        key="phonepe-instructions"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
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
                              Scan the QR on desktop or continue in the PhonePe
                              app on mobile.
                            </li>
                            <li>
                              We’ll automatically confirm your payment and place
                              the order.
                            </li>
                          </ol>
                          <p className="text-xs text-slate-500">
                            Need to change the payment option? You can always
                            switch back to Cash on Delivery.
                          </p>
                        </div>
                      </motion.section>
                    )
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={() => navigate("/checkout/address")}
                      className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-secondary transition hover:border-primary/50 hover:bg-primary/5 sm:w-auto"
                    >
                      Back to Address
                    </button>
                  )}
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
            </div>
          </div>
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
