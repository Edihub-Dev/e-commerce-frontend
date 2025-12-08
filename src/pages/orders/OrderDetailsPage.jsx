import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import api, {
  fetchOrderById,
  rateOrderItem,
  submitReplacementRequest,
} from "../../utils/api";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  MapPin,
  PackageCheck,
  Star,
  MessageCircle,
  Send,
  Circle,
  CheckCircle2,
  RotateCcw,
  X,
  AlertCircle,
} from "lucide-react";

const TIMELINE_SEQUENCE = [
  {
    key: "order_confirmed",
    label: "Order Confirmed",
    defaultDescription: "Your order has been placed.",
  },
  {
    key: "processed",
    label: "Processed",
    defaultDescription: "Seller has processed your order.",
  },
  {
    key: "picked_up",
    label: "Picked Up",
    defaultDescription: "Your item has been picked up by delivery partner.",
  },
  {
    key: "shipped",
    label: "Shipped",
    defaultDescription: "Package is on the way to the nearest hub.",
  },
  {
    key: "out_for_delivery",
    label: "Out For Delivery",
    defaultDescription: "Your order is out for delivery.",
  },
  {
    key: "delivered",
    label: "Delivered",
    defaultDescription: "Your item has been delivered.",
  },
  {
    key: "returned",
    label: "Return Initiated",
    defaultDescription: "Return or replacement processing has begun.",
  },
];

const formatTimelineDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN") : "--";

const TIMELINE_ALIAS_MAP = {
  "order placed": "order_confirmed",
  "order confirmed": "order_confirmed",
  processed: "processed",
  "seller processed": "processed",
  packed: "processed",
  picked_up: "picked_up",
  "picked up": "picked_up",
  "item picked up": "picked_up",
  shipped: "shipped",
  dispatched: "shipped",
  "out for delivery": "out_for_delivery",
  delivered: "delivered",
  returned: "returned",
  "return initiated": "returned",
  "return approved": "returned",
  "return request rejected": "returned",
};

const resolveStepKey = (label = "") => {
  const normalized = String(label).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (TIMELINE_ALIAS_MAP[normalized]) {
    return TIMELINE_ALIAS_MAP[normalized];
  }

  const matched = TIMELINE_SEQUENCE.find(
    (step) =>
      step.label.toLowerCase() === normalized ||
      step.key.replace(/_/g, " ") === normalized
  );

  return matched?.key || null;
};

const buildTimeline = (order) => {
  if (!order) return [];

  const timelineMap = new Map();
  (order.statusTimeline || []).forEach((entry = {}) => {
    const stepKey = resolveStepKey(entry.label);
    if (!stepKey) {
      return;
    }

    const existing = timelineMap.get(stepKey);
    const currentAt = entry.at ? new Date(entry.at).getTime() : 0;
    const existingAt = existing?.at ? new Date(existing.at).getTime() : 0;

    if (!existing || currentAt >= existingAt) {
      timelineMap.set(stepKey, {
        label: entry.label,
        description: entry.description,
        at: entry.at,
      });
    }
  });

  const statusLookup = {
    processing: "order confirmed",
    confirmed: "order confirmed",
    picked_up: "picked up",
    shipped: "shipped",
    out_for_delivery: "out for delivery",
    delivered: "delivered",
    cancelled: "cancelled",
    returned: "returned",
  };

  const normalizedStatus = String(order.status || "").toLowerCase();
  const mappedStatus = statusLookup[normalizedStatus] || normalizedStatus;
  const resolvedCurrentKey = resolveStepKey(mappedStatus) || "order_confirmed";
  const currentIndex = TIMELINE_SEQUENCE.findIndex(
    (step) => step.key === resolvedCurrentKey
  );
  const fallbackCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
  const hasTimelineHistory = timelineMap.size > 0;

  const hasReturnFlow = Boolean(
    order.replacementRequest && order.replacementRequest.status !== "none"
  );
  const includeReturnStep =
    hasReturnFlow ||
    timelineMap.has("returned") ||
    resolvedCurrentKey === "returned";

  const sequence = includeReturnStep
    ? TIMELINE_SEQUENCE
    : TIMELINE_SEQUENCE.filter((step) => step.key !== "returned");

  return sequence.map((step) => {
    const timelineEntry = timelineMap.get(step.key) || null;
    const stepIndex = sequence.findIndex(
      (sequenceStep) => sequenceStep.key === step.key
    );
    const effectiveCurrentIndex = hasTimelineHistory
      ? currentIndex
      : fallbackCurrentIndex;
    const isDeliveredState = resolvedCurrentKey === "delivered";

    let isCompleted = Boolean(timelineEntry?.at);
    let isCurrent = false;

    if (!timelineEntry?.at) {
      if (effectiveCurrentIndex !== -1) {
        if (stepIndex < effectiveCurrentIndex) {
          isCompleted = true;
        } else if (stepIndex === effectiveCurrentIndex && !isDeliveredState) {
          isCurrent = true;
        }
      } else if (!hasTimelineHistory && stepIndex === 0) {
        isCurrent = true;
      }
    }

    if (isDeliveredState && effectiveCurrentIndex !== -1) {
      isCompleted = stepIndex <= effectiveCurrentIndex;
      isCurrent = false;
    }

    return {
      ...step,
      label: timelineEntry?.label || step.label,
      isCompleted,
      isCurrent,
      description: timelineEntry?.description || step.defaultDescription,
      at: timelineEntry?.at || null,
    };
  });
};

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAdminOrders = location.state?.from === "admin-orders";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingIndex, setSubmittingIndex] = useState(null);
  const [isReplacementModalOpen, setReplacementModalOpen] = useState(false);
  const [replacementSubmitting, setReplacementSubmitting] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    itemIndex: 0,
    description: "",
    size: "",
    color: "",
    remarks: "",
  });

  const apiBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL;
    if (configured) {
      const trimmed = configured.replace(/\/$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
    return "http://localhost:5000/api";
  }, []);

  const handleBackNavigation = () => {
    if (fromAdminOrders) {
      navigate("/admin/orders", { replace: true });
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const response = await fetchOrderById(orderId);
        const data = response?.data;
        if (!data) {
          throw new Error("Order not found");
        }
        setOrder(data);
      } catch (err) {
        console.error("Failed to load order", err);
        const message =
          err.response?.data?.message || err.message || "Failed to load order";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const csvRow = useMemo(() => {
    if (!order) return null;

    const itemsSummary = (order.items || [])
      .map((item) => {
        const extras = [
          item.quantity ? `x${item.quantity}` : null,
          item.size ? `Size ${item.size}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        return extras ? `${item.name} (${extras})` : item.name;
      })
      .join(" | ");

    const paymentStatusLabels = {
      paid: "Successful",
      pending: "Pending",
      failed: "Failed",
    };

    const paymentMethodLabels = {
      cod: "Cash on Delivery",
      upi: "UPI",
      qr: "QR Code",
      card: "Card",
      netbanking: "Net Banking",
    };

    const paymentStatus = order.payment?.status?.toLowerCase();
    const paymentMethod = order.payment?.method?.toLowerCase();
    const totalAmount = order.totalAmount ?? order.pricing?.total ?? 0;

    return {
      id: order._id,
      placedAt: order.createdAt ? new Date(order.createdAt).toISOString() : "",
      customer: order.shippingAddress?.fullName || "Customer",
      email: order.shippingAddress?.email || "--",
      itemsSummary,
      total: Number(totalAmount).toFixed(2),
      orderStatus: (order.status || "processing").replace(/_/g, " "),
      paymentMethod:
        paymentMethodLabels[paymentMethod] ||
        paymentMethod?.toUpperCase?.() ||
        "",
      paymentStatus: paymentStatusLabels[paymentStatus] || paymentStatus || "",
    };
  }, [order]);

  const deliveryDate = useMemo(() => {
    if (!order?.estimatedDeliveryDate) {
      return "To be updated";
    }

    return new Date(order.estimatedDeliveryDate).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [order?.estimatedDeliveryDate]);

  const timelineSteps = useMemo(() => buildTimeline(order), [order]);

  useEffect(() => {
    if (order?.items?.length) {
      setReplacementForm((prev) => ({
        ...prev,
        itemIndex:
          prev.itemIndex >= 0 && prev.itemIndex < order.items.length
            ? prev.itemIndex
            : 0,
      }));
    }
  }, [order?.items?.length]);

  const deliveredTimestamp = useMemo(() => {
    if (!order?.statusTimeline?.length) {
      return order?.status === "delivered" ? order.updatedAt : null;
    }

    for (let index = order.statusTimeline.length - 1; index >= 0; index -= 1) {
      const entry = order.statusTimeline[index];
      const label = String(entry?.label || "").toLowerCase();
      if (label.includes("delivered")) {
        return entry.at || entry.createdAt || entry.updatedAt || null;
      }
    }

    return order?.status === "delivered" ? order.updatedAt : null;
  }, [order?.statusTimeline, order?.status, order?.updatedAt]);

  const replacementRequest = order?.replacementRequest || {};
  const replacementStatusActive = Boolean(
    replacementRequest?.status && replacementRequest.status !== "none"
  );

  const replacementWindowActive = useMemo(() => {
    if (!deliveredTimestamp) return false;
    const deliveredAt = new Date(deliveredTimestamp).getTime();
    if (Number.isNaN(deliveredAt)) return false;
    const diff = Date.now() - deliveredAt;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return diff >= 0 && diff <= sevenDaysMs;
  }, [deliveredTimestamp]);

  const canRequestReplacement =
    replacementWindowActive &&
    !replacementStatusActive &&
    !replacementRequest.used;

  const canReviewItems = useMemo(
    () => Boolean(deliveredTimestamp && order?.status === "delivered"),
    [deliveredTimestamp, order?.status]
  );

  const replacementAvailabilityMessage = useMemo(() => {
    if (replacementStatusActive) {
      return null;
    }

    if (!replacementWindowActive) {
      return "Return & replace is available within 7 days after delivery.";
    }

    return "Return & replace can be requested once per order while the request window is active.";
  }, [replacementStatusActive, replacementWindowActive]);

  const handleSelectRating = (itemIndex, value) => {
    if (order?.items?.[itemIndex]?.ratedAt || submittingIndex !== null) {
      return;
    }
    if (!canReviewItems) {
      toast.error("You can rate items after the order is delivered.");
      return;
    }
    setActiveItemIndex(itemIndex);
    setRatingDrafts((prev) => ({
      ...prev,
      [itemIndex]: {
        rating: value,
        review: prev[itemIndex]?.review || "",
      },
    }));
  };

  const handleReviewChange = (itemIndex, value) => {
    setRatingDrafts((prev) => ({
      ...prev,
      [itemIndex]: {
        rating: prev[itemIndex]?.rating || 0,
        review: value,
      },
    }));
  };

  const handleOpenReplacementModal = () => {
    setReplacementForm((prev) => ({
      ...prev,
      itemIndex: prev.itemIndex ?? 0,
      description: "",
      size: "",
      color: "",
      remarks: "",
    }));
    setReplacementModalOpen(true);
  };

  const handleReplacementInputChange = (field, value) => {
    setReplacementForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectedReplacementItem = useMemo(() => {
    if (!order?.items?.length) return null;
    return order.items[replacementForm.itemIndex] || null;
  }, [order?.items, replacementForm.itemIndex]);

  const handleSubmitReplacement = async (event) => {
    event.preventDefault();
    if (!order?._id) return;
    if (
      !replacementForm.description ||
      replacementForm.description.trim().length < 10
    ) {
      toast.error("Please describe the issue (minimum 10 characters).");
      return;
    }

    try {
      setReplacementSubmitting(true);
      const payload = {
        itemIndex: replacementForm.itemIndex,
        description: replacementForm.description.trim(),
        replacement: {
          size: replacementForm.size.trim() || undefined,
          color: replacementForm.color.trim() || undefined,
          remarks: replacementForm.remarks.trim() || undefined,
        },
      };
      const response = await submitReplacementRequest(order._id, payload);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to submit request");
      }

      setOrder((prev) => ({
        ...prev,
        replacementRequest: response.data,
      }));
      setReplacementModalOpen(false);
      toast.success("Replacement request sent to support.");
    } catch (submitError) {
      console.error("Replacement request failed", submitError);
      const message =
        submitError?.response?.data?.message ||
        submitError?.message ||
        "Failed to submit request";
      toast.error(message);
    } finally {
      setReplacementSubmitting(false);
    }
  };

  const handleSubmitRating = async (itemIndex) => {
    const draft = ratingDrafts[itemIndex];
    if (
      !draft?.rating ||
      submittingIndex !== null ||
      order?.items?.[itemIndex]?.ratedAt
    ) {
      return;
    }

    try {
      setSubmittingIndex(itemIndex);

      const response = await rateOrderItem(order._id, {
        itemIndex,
        rating: draft.rating,
        review: draft.review?.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Unable to submit rating");
      }

      const updatedItems = order.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              rating: response.data?.rating,
              review: response.data?.review,
              ratedAt: response.data?.ratedAt,
            }
          : item
      );

      setOrder((prev) => ({
        ...prev,
        items: updatedItems,
      }));

      setActiveItemIndex(null);
      setRatingDrafts((prev) => {
        const copy = { ...prev };
        delete copy[itemIndex];
        return copy;
      });
      toast.success("Thank you for rating this product!");
    } catch (ratingError) {
      console.error("Failed to submit rating", ratingError);
      toast.error(ratingError.message || "Unable to submit rating");
    } finally {
      setSubmittingIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10 text-center text-medium-text">
        Fetching order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10 text-center space-y-4">
        <p className="text-lg font-semibold text-secondary">
          Unable to load order
        </p>
        <p className="text-medium-text">{error || "Order not found"}</p>
        <button
          onClick={handleBackNavigation}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const isPaymentPaid =
    (order?.payment?.status || "pending").toLowerCase() === "paid";

  const handleDownloadInvoice = async () => {
    if (!order?._id) {
      toast.error("Order details unavailable");
      return;
    }

    if (!isPaymentPaid) {
      toast.error("Invoice will be available once the payment is successful.");
      return;
    }

    setDownloadingInvoice(true);

    let toastId = null;
    try {
      toastId = toast.loading("Preparing your invoice...", {
        duration: 10000,
        position: "top-center",
      });
      const response = await api.get(`/orders/${order._id}/invoice`, {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      });

      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || `invoice-${order._id}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded. Check your files to open it.", {
        id: toastId,
        duration: 5000,
        position: "top-center",
      });
    } catch (downloadError) {
      console.error("Invoice download failed", downloadError);
      const message =
        downloadError?.response?.data?.message ||
        downloadError?.message ||
        "Unable to download invoice. Please try again.";
      toast.error(message, {
        id: toastId || undefined,
        duration: 5000,
        position: "top-center",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!csvRow) {
      toast.error("Order data not ready yet");
      return;
    }

    const escapeCsvValue = (value) => {
      if (value === undefined || value === null) return "";
      const stringValue = String(value);
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = [
      "Order ID",
      "Placed At",
      "Customer",
      "Email",
      "Items",
      "Total",
      "Order Status",
      "Payment Method",
      "Payment Status",
    ];

    const row = [
      csvRow.id,
      csvRow.placedAt,
      csvRow.customer,
      csvRow.email,
      csvRow.itemsSummary,
      csvRow.total,
      csvRow.orderStatus,
      csvRow.paymentMethod,
      csvRow.paymentStatus,
    ];

    const csvContent = [headers, row]
      .map((currentRow) => currentRow.map(escapeCsvValue).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `order-${csvRow.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value) => {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
  };

  const subtotal = order?.pricing?.subtotal ?? order?.pricing?.itemTotal ?? 0;
  const shippingFee = order?.pricing?.shippingFee ?? 0;
  const taxAmount = order?.pricing?.taxAmount ?? 0;
  const discount = order?.pricing?.discount ?? 0;
  const total = order?.pricing?.total ?? order?.totalAmount ?? 0;
  const coupon = order?.coupon;
  const couponDiscount = Number.isFinite(Number(coupon?.discountAmount))
    ? Number(coupon.discountAmount)
    : discount;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 lg:py-10 space-y-6">
      <button
        onClick={handleBackNavigation}
        className="inline-flex items-center gap-2 text-sm text-medium-text hover:text-secondary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-secondary break-all">
            Order #{order._id}
          </h1>
          <p className="text-sm text-medium-text break-words">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="grid gap-4 text-sm text-medium-text md:grid-cols-2 md:items-end">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-secondary" />
            <span className="whitespace-nowrap text-secondary">
              <span className="font-medium">Items:</span>{" "}
              <span className="text-medium-text">
                {order.items?.length || 0}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 md:justify-end md:text-right">
            <MapPin className="h-4 w-4 text-secondary" />
            <span className="text-secondary md:text-right">
              <span className="font-medium">Estimated delivery:</span>{" "}
              <span className="text-medium-text whitespace-nowrap">
                {deliveryDate}
              </span>
            </span>
          </div>
        </div>
      </motion.div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-6">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-secondary">
            Tracking Updates
          </h2>
          <p className="text-sm text-medium-text">
            Tracking ID: {order?.shipping?.trackingId || "To be assigned"}
          </p>
          <p className="text-xs text-slate-400">
            Courier: {order?.shipping?.courier || "Ekart Logistics"}
          </p>
        </header>
        <div className="relative">
          <ul className="relative">
            {timelineSteps.map((step, index) => {
              const Icon = step.isCompleted ? CheckCircle2 : Circle;
              const isLast = index === timelineSteps.length - 1;
              const showConnector = !isLast;
              const previousStep = index > 0 ? timelineSteps[index - 1] : null;
              const showTopConnector = index > 0;
              const resolveConnectorClass = (timelineStep) =>
                timelineStep?.isCompleted
                  ? "bg-emerald-500"
                  : timelineStep?.isCurrent
                  ? "bg-primary/40"
                  : "bg-slate-200";
              const markerVars = {
                "--timeline-marker-size": "1.5rem",
                "--timeline-gap": "1.5rem",
              };
              return (
                <li
                  key={step.key}
                  className="relative grid grid-cols-[auto,1fr] gap-4 py-6 first:pt-0 last:pb-0"
                  style={markerVars}
                >
                  <div className="relative flex w-6 justify-center">
                    {showTopConnector && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-1/2 w-[2px] -translate-x-1/2 ${resolveConnectorClass(
                          previousStep
                        )}`}
                        style={{
                          top: "calc(-1 * var(--timeline-gap))",
                          bottom: "calc(var(--timeline-marker-size) / 2)",
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 inline-flex h-[var(--timeline-marker-size)] w-[var(--timeline-marker-size)] items-center justify-center rounded-full border-2 ${
                        step.isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : step.isCurrent
                          ? "border-primary bg-white text-primary"
                          : "border-slate-300 bg-white text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {showConnector && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-1/2 w-[2px] -translate-x-1/2 ${resolveConnectorClass(
                          step
                        )}`}
                        style={{
                          top: "calc(var(--timeline-marker-size) / 2)",
                          bottom: "calc(-1 * var(--timeline-gap))",
                        }}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-secondary">
                        {step.label}
                      </p>
                      {step.at && (
                        <span className="text-xs text-slate-400">
                          {formatTimelineDate(step.at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-medium-text whitespace-pre-line">
                      {step.description}
                    </p>
                    {step.key === "shipped" && order?.shipping?.trackingId && (
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-medium-text">
                        <p>
                          {order.shipping.courier || "Ekart Logistics"} •{" "}
                          {order.shipping.trackingId}
                        </p>
                        <p className="mt-1 text-slate-400">
                          Last updated{" "}
                          {formatTimelineDate(order.shipping.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {replacementStatusActive ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-secondary">
                Return & Replace status
              </h2>
              <p className="text-xs text-medium-text">
                Requested on{" "}
                {replacementRequest.requestedAt
                  ? new Date(replacementRequest.requestedAt).toLocaleString()
                  : "--"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {replacementRequest.status.replace(/_/g, " ")}
            </span>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-medium-text">
              <h3 className="text-sm font-semibold text-secondary">
                Item details
              </h3>
              <p className="font-medium text-secondary">
                {replacementRequest.itemName}
                {replacementRequest.itemSize &&
                  ` • Size ${replacementRequest.itemSize}`}
              </p>
              <p>Quantity: {replacementRequest.quantity || 1}</p>
              {replacementRequest.issueDescription && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {replacementRequest.issueDescription}
                </p>
              )}
            </div>
            <div className="space-y-2 text-sm text-medium-text">
              <h3 className="text-sm font-semibold text-secondary">
                Replacement preference
              </h3>
              <p>
                Size: {replacementRequest.replacementPreferences?.size || "--"}
              </p>
              <p>
                Color:{" "}
                {replacementRequest.replacementPreferences?.color || "--"}
              </p>
              <p>
                Notes:{" "}
                {replacementRequest.replacementPreferences?.remarks || "--"}
              </p>
              {replacementRequest.adminNotes && (
                <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                  Admin notes: {replacementRequest.adminNotes}
                </p>
              )}
            </div>
          </div>
          {Array.isArray(replacementRequest.history) &&
          replacementRequest.history.length ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-secondary">
                Activity
              </h3>
              <ul className="space-y-2 text-xs text-medium-text">
                {replacementRequest.history
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <li
                      key={`${entry.at || index}-${entry.status}`}
                      className="flex items-start gap-2"
                    >
                      <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-secondary">
                          {entry.status?.replace(/_/g, " ") || "Update"}
                        </p>
                        <p className="text-medium-text">
                          {entry.note || "Status updated"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {entry.at
                            ? new Date(entry.at).toLocaleString()
                            : "--"}
                          {entry.actor ? ` • by ${entry.actor}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-secondary">
            Items in your order
          </h2>
          {canRequestReplacement && (
            <button
              type="button"
              onClick={handleOpenReplacementModal}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark"
            >
              <RotateCcw className="h-4 w-4" /> Request return & replace
            </button>
          )}
        </div>
        {replacementAvailabilityMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="h-4 w-4" />
            {replacementAvailabilityMessage}
          </div>
        )}
        <div className="space-y-4">
          {order.items?.map((item, index) => {
            const formattedPrice = item.price.toLocaleString();
            const formattedLineTotal = (
              item.price * item.quantity
            ).toLocaleString();

            return (
              <div
                key={`${item.name}-${index}`}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-secondary">{item.name}</p>
                    <p className="text-sm text-medium-text">
                      Qty: {item.quantity}
                      {item.size && (
                        <span className="ml-2">• Size: {item.size}</span>
                      )}
                    </p>
                    <p className="text-sm text-medium-text">
                      Price: ₹{formattedPrice}
                    </p>
                    <p className="text-sm text-medium-text">
                      Line Total: ₹{formattedLineTotal}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  {item.ratedAt ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        {[...Array(5)].map((_, starIndex) => (
                          <Star
                            key={starIndex}
                            size={18}
                            className={
                              starIndex < Math.round(item.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-300"
                            }
                          />
                        ))}
                        <span className="text-xs text-medium-text">
                          Rated on {new Date(item.ratedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {item.review && (
                        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-medium-text">
                          <MessageCircle className="h-4 w-4 text-secondary mt-0.5" />
                          <p className="whitespace-pre-line break-words">
                            {item.review}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : canReviewItems ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, starIndex) => {
                          const ratingValue = starIndex + 1;
                          const currentDraft = ratingDrafts[index]?.rating || 0;
                          const isActive = currentDraft >= ratingValue;
                          return (
                            <button
                              key={ratingValue}
                              type="button"
                              onClick={() =>
                                handleSelectRating(index, ratingValue)
                              }
                              className="focus:outline-none"
                              disabled={submittingIndex !== null}
                              aria-label={`Rate ${ratingValue} star${
                                ratingValue > 1 ? "s" : ""
                              }`}
                            >
                              <Star
                                size={24}
                                className={
                                  isActive
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-slate-300"
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                      {activeItemIndex === index &&
                        ratingDrafts[index]?.rating > 0 && (
                          <div className="space-y-3">
                            <textarea
                              value={ratingDrafts[index]?.review || ""}
                              onChange={(event) =>
                                handleReviewChange(index, event.target.value)
                              }
                              placeholder="Share your experience with this product (optional)"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-medium-text focus:border-primary focus:outline-none"
                              rows={3}
                              maxLength={2000}
                              disabled={submittingIndex !== null}
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleSubmitRating(index)}
                                disabled={submittingIndex !== null}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Send className="h-4 w-4" />
                                {submittingIndex === index
                                  ? "Submitting..."
                                  : "Submit review"}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-2 text-sm text-medium-text break-words">
          <h3 className="text-lg font-semibold text-secondary mb-2">
            Delivery Address
          </h3>
          <p className="font-medium text-secondary">
            {order.shippingAddress?.fullName}
          </p>
          <p>{order.shippingAddress?.addressLine}</p>
          <p>
            {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
            {order.shippingAddress?.pincode}
          </p>
          <p>Mobile: {order.shippingAddress?.mobile}</p>
          {order.shippingAddress?.alternatePhone && (
            <p>Alternate: {order.shippingAddress.alternatePhone}</p>
          )}
          <p>Email: {order.shippingAddress?.email}</p>
        </div>
        <div className="space-y-2 text-sm text-medium-text">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-secondary">
              Payment Summary
            </h3>
            {coupon?.code && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Coupon applied
              </span>
            )}
          </div>
          <p className="flex justify-between gap-3">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span>Shipping Fee</span>
            <span>{formatCurrency(shippingFee)}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span>Tax</span>
            <span>{formatCurrency(taxAmount)}</span>
          </p>
          <p className="flex justify-between text-success font-medium gap-3">
            <span>Discount</span>
            <span>-{formatCurrency(discount)}</span>
          </p>
          <p className="flex justify-between text-base font-semibold text-slate-900 border-t border-slate-200 pt-3 gap-3">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </p>
          <p className="text-xs text-slate-400 pt-1 break-words">
            Method: {order.payment?.method?.toUpperCase?.()} • Status:{" "}
            {order.payment?.status}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={handleBackNavigation}
          className="px-5 py-3 rounded-xl border border-slate-200 text-secondary hover:bg-slate-50"
        >
          Back to Orders
        </button>
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={downloadingInvoice || !isPaymentPaid}
          className="px-5 py-3 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {downloadingInvoice
            ? "Preparing Invoice..."
            : isPaymentPaid
            ? "Download Invoice"
            : "Invoice available after payment"}
        </button>
      </div>

      {isReplacementModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-secondary">
                  Return & Replace request
                </h2>
                <p className="text-xs text-medium-text">
                  Tell us what went wrong so we can arrange a replacement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplacementModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmitReplacement}>
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                <label className="space-y-2 text-sm text-medium-text">
                  <span className="font-medium text-secondary">
                    Select product
                  </span>
                  <select
                    value={replacementForm.itemIndex}
                    onChange={(event) =>
                      handleReplacementInputChange(
                        "itemIndex",
                        Number(event.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {order?.items?.map((item, index) => (
                      <option key={`${item.name}-${index}`} value={index}>
                        {item.name}
                        {item.size ? ` • Size ${item.size}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedReplacementItem ? (
                  <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <img
                      src={selectedReplacementItem.image}
                      alt={selectedReplacementItem.name}
                      className="h-20 w-20 rounded-lg object-contain"
                    />
                  </div>
                ) : null}
              </div>

              <label className="space-y-2 text-sm text-medium-text">
                <span className="font-medium text-secondary">
                  Describe the issue
                </span>
                <textarea
                  value={replacementForm.description}
                  onChange={(event) =>
                    handleReplacementInputChange(
                      "description",
                      event.target.value
                    )
                  }
                  required
                  minLength={10}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Share what went wrong with the product."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-medium-text">
                  <span className="font-medium text-secondary">
                    Preferred size
                  </span>
                  <input
                    value={replacementForm.size}
                    onChange={(event) =>
                      handleReplacementInputChange("size", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. L"
                  />
                </label>
                <label className="space-y-2 text-sm text-medium-text">
                  <span className="font-medium text-secondary">
                    Preferred color
                  </span>
                  <input
                    value={replacementForm.color}
                    onChange={(event) =>
                      handleReplacementInputChange("color", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Blue"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-medium-text">
                <span className="font-medium text-secondary">
                  Additional notes (optional)
                </span>
                <input
                  value={replacementForm.remarks}
                  onChange={(event) =>
                    handleReplacementInputChange("remarks", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Share anything else the team should know."
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReplacementModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-secondary hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replacementSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {replacementSubmitting ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" /> Send request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
