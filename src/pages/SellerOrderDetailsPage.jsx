import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import api, {
  fetchOrderById,
  sellerUpdateReplacementRequest,
} from "../utils/api";
import {
  ArrowLeft,
  Download,
  Loader2,
  MapPin,
  PackageCheck,
  Truck,
  CreditCard,
  Receipt,
  RefreshCcw,
  ClipboardList,
  ClipboardCheck,
} from "lucide-react";
import {
  REPLACEMENT_STATUS_OPTIONS,
  STATUSES_REQUIRING_REASON,
} from "../constants/replacementRequest";

const STATUS_LABELS = {
  processing: {
    label: "Processing",
    badge: "bg-amber-100 text-amber-700",
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-blue-100 text-blue-700",
  },
  shipped: {
    label: "Shipped",
    badge: "bg-sky-100 text-sky-700",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    badge: "bg-indigo-100 text-indigo-700",
  },
  delivered: {
    label: "Delivered",
    badge: "bg-emerald-100 text-emerald-700",
  },
  returned: {
    label: "Return/Replace",
    badge: "bg-rose-100 text-rose-700",
  },
};

const REPLACEMENT_STATUS_STYLES = {
  pending: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  approved: {
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  pickup_scheduled: {
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  pickup_completed: {
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  replacement_processing: {
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
  },
  replacement_shipped: {
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  replacement_out_for_delivery: {
    badge: "bg-cyan-100 text-cyan-700",
    dot: "bg-cyan-500",
  },
  replacement_delivered: {
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  rejected: {
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
  cancelled: {
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  default: {
    badge: "bg-slate-200 text-slate-600",
    dot: "bg-slate-500",
  },
};

const formatCurrency = (value) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
};

const formatDateTime = (value, fallback = "--") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleString();
};

const formatDate = (value, fallback = "--") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? fallback
    : parsed.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

const SellerOrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [replacementUpdate, setReplacementUpdate] = useState({
    status: "approved",
    notes: "",
    courier: "",
    trackingId: "",
  });
  const [savingReplacement, setSavingReplacement] = useState(false);
  const notesRef = useRef(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchOrderById(orderId);
      const data = response?.data;
      if (!data) {
        throw new Error("Order not found");
      }
      setOrder(data);
      if (
        data.replacementRequest &&
        data.replacementRequest.status !== "none"
      ) {
        setReplacementUpdate((prev) => ({
          ...prev,
          status: "approved",
          notes: "",
          courier: data.replacementRequest.replacementShipment?.courier || "",
          trackingId:
            data.replacementRequest.replacementShipment?.trackingId || "",
        }));
      }
    } catch (fetchError) {
      console.error("Failed to load order", fetchError);
      const message =
        fetchError?.response?.data?.message ||
        fetchError.message ||
        "Failed to load order";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleBack = () => {
    navigate("/seller/orders");
  };

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

    try {
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
    } catch (downloadError) {
      console.error("Invoice download failed", downloadError);
      const message =
        downloadError?.response?.data?.message ||
        downloadError?.message ||
        "Unable to download invoice. Please try again.";
      toast.error(message);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const statusBadge = useMemo(() => {
    const key = String(order?.status || "").toLowerCase();
    const config = STATUS_LABELS[key];
    if (!config) {
      return (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          Unknown
        </span>
      );
    }
    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${config.badge}`}
      >
        {config.label}
      </span>
    );
  }, [order?.status]);

  const deliveryDate = useMemo(
    () => formatDate(order?.estimatedDeliveryDate),
    [order?.estimatedDeliveryDate]
  );

  const subtotal = order?.pricing?.subtotal ?? 0;
  const shippingFee = order?.pricing?.shippingFee ?? 0;
  const taxAmount = order?.pricing?.taxAmount ?? 0;
  const discount = order?.pricing?.discount ?? 0;
  const total = order?.pricing?.total ?? 0;
  const coupon = order?.coupon;

  const items = Array.isArray(order?.items) ? order.items : [];
  const replacementRequest = order?.replacementRequest || {};
  const replacementStatusActive = Boolean(
    replacementRequest?.status && replacementRequest.status !== "none"
  );
  const replacementHistory = useMemo(() => {
    if (!Array.isArray(replacementRequest.history)) {
      return [];
    }

    return replacementRequest.history.slice().sort((a, b) => {
      const aTime = a?.at ? new Date(a.at).getTime() : 0;
      const bTime = b?.at ? new Date(b.at).getTime() : 0;
      return bTime - aTime;
    });
  }, [replacementRequest.history]);

  const formatReplacementStatus = (value) => {
    if (!value) return "--";
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const replacementTone = useMemo(() => {
    const key = String(replacementRequest.status || "").toLowerCase();
    return REPLACEMENT_STATUS_STYLES[key] || REPLACEMENT_STATUS_STYLES.default;
  }, [replacementRequest.status]);

  const handleReplacementFieldChange = (field, value) => {
    setReplacementUpdate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (STATUSES_REQUIRING_REASON.has(replacementUpdate.status)) {
      setReplacementUpdate((prev) => ({
        ...prev,
        notes: prev.notes || "",
      }));
      notesRef.current?.focus();
    }
  }, [replacementUpdate.status]);

  const handleSubmitReplacementUpdate = async (event) => {
    event.preventDefault();
    if (!order?._id) return;

    if (
      STATUSES_REQUIRING_REASON.has(replacementUpdate.status) &&
      !(replacementUpdate.notes && replacementUpdate.notes.trim())
    ) {
      toast.error("Please provide a reason for rejecting this request.");
      notesRef.current?.focus();
      return;
    }

    try {
      setSavingReplacement(true);
      const payload = {
        status: replacementUpdate.status,
        notes: replacementUpdate.notes?.trim() || undefined,
        courier: replacementUpdate.courier?.trim() || undefined,
        trackingId: replacementUpdate.trackingId?.trim() || undefined,
      };

      const response = await sellerUpdateReplacementRequest(order._id, payload);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to update request");
      }

      toast.success("Replacement request updated");
      await loadOrder();
    } catch (updateError) {
      console.error("Failed to update replacement request", updateError);
      const message =
        updateError?.response?.data?.message ||
        updateError?.message ||
        "Unable to update replacement request";
      toast.error(message);
    } finally {
      setSavingReplacement(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Loading order details...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-slate-600">
        <div className="rounded-3xl bg-white px-8 py-10 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Order not available
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {error || "The requested order could not be found."}
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </button>
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={downloadingInvoice || !isPaymentPaid}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          title={
            isPaymentPaid
              ? undefined
              : "Invoice will be available once the payment is successful."
          }
        >
          {downloadingInvoice ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isPaymentPaid ? "Download invoice" : "Invoice locked"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Order #{order._id}</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {order.shippingAddress?.fullName || "Customer"}
            </h1>
            <div className="text-sm text-slate-500">
              Placed on {formatDateTime(order.createdAt)}
            </div>
          </div>
          {statusBadge}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <PackageCheck className="h-5 w-5" /> Items
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {items.length || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <CreditCard className="h-5 w-5" /> Payment
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {order.payment?.method?.toUpperCase?.() || "--"}
            </p>
            <p className="text-xs text-slate-500">
              Status: {order.payment?.status || "--"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Truck className="h-5 w-5" /> Delivery
            </div>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {deliveryDate}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Receipt className="h-5 w-5" /> Total
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </motion.div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Order items</h2>
        <div className="mt-4 divide-y divide-slate-200">
          {items.map((item, index) => (
            <div
              key={`${item.product || item.name}-${index}`}
              className="flex flex-col gap-4 py-4 sm:flex-row"
            >
              <div className="flex items-center gap-4 sm:w-1/2">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                  {item.size && (
                    <p className="text-xs text-slate-500">Size: {item.size}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>Qty: {item.quantity}</span>
                <span>Price: {formatCurrency(item.price)}</span>
                <span>Total: {formatCurrency(item.price * item.quantity)}</span>
                {item.ratedAt && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    Rated {item.rating ?? 0}/5
                  </span>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No items available for this order.
            </p>
          )}
        </div>
      </section>

      {replacementStatusActive && (
        <section className="rounded-3xl border border-sky-100 bg-sky-50/60 p-6 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                <RefreshCcw className="h-4 w-4 text-sky-500" /> Return & Replace
                request
              </h2>
              <p className="text-xs text-slate-500">
                Requested on{" "}
                {replacementRequest.requestedAt
                  ? new Date(replacementRequest.requestedAt).toLocaleString()
                  : "--"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleReplacementFieldChange("status", "approved")
                }
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-100"
              >
                Approve request
              </button>
              <button
                type="button"
                onClick={() =>
                  handleReplacementFieldChange("status", "rejected")
                }
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100"
              >
                Reject request
              </button>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${replacementTone.badge}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${replacementTone.dot}`}
                />
                {formatReplacementStatus(replacementRequest.status)}
              </span>
            </div>
          </header>

          <form
            className="mt-6 grid gap-6 lg:grid-cols-2"
            onSubmit={handleSubmitReplacementUpdate}
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-sky-700">
                  Item details
                </p>
                <div className="mt-2 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-900">
                    {replacementRequest.itemName || "--"}
                    {replacementRequest.itemSize && (
                      <span className="text-xs text-slate-500">
                        {` • Size ${replacementRequest.itemSize}`}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Quantity: {replacementRequest.quantity || 1}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-700">
                  Issue description
                </p>
                <div className="mt-2 min-h-[72px] rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
                  {replacementRequest.issueDescription ||
                    "No description provided."}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-sky-700">
                  Replacement preferences
                </p>
                <div className="mt-2 rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Size</span>
                    <span className="font-medium text-slate-900">
                      {replacementRequest.replacementPreferences?.size || "--"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-slate-500">Color</span>
                    <span className="font-medium text-slate-900">
                      {replacementRequest.replacementPreferences?.color || "--"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-500">Notes</span>
                    <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {replacementRequest.replacementPreferences?.remarks ||
                        "--"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Update status
                  </p>
                  <select
                    value={replacementUpdate.status}
                    onChange={(event) =>
                      handleReplacementFieldChange("status", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-sky-300 focus:outline-none"
                    required
                  >
                    {REPLACEMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Courier (optional)
                    </p>
                    <input
                      value={replacementUpdate.courier}
                      onChange={(event) =>
                        handleReplacementFieldChange(
                          "courier",
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-sky-300 focus:outline-none"
                      placeholder="e.g. Delhivery"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tracking ID (optional)
                    </p>
                    <input
                      value={replacementUpdate.trackingId}
                      onChange={(event) =>
                        handleReplacementFieldChange(
                          "trackingId",
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-sky-300 focus:outline-none"
                      placeholder="e.g. AWB123456"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes for customer
                  </p>
                  <textarea
                    value={replacementUpdate.notes}
                    onChange={(event) =>
                      handleReplacementFieldChange("notes", event.target.value)
                    }
                    rows={3}
                    ref={notesRef}
                    required={STATUSES_REQUIRING_REASON.has(
                      replacementUpdate.status
                    )}
                    className={`mt-1 w-full rounded-xl border px-3 py-3 text-sm text-slate-600 focus:border-sky-300 focus:outline-none ${
                      STATUSES_REQUIRING_REASON.has(replacementUpdate.status)
                        ? "border-rose-200"
                        : "border-slate-200 bg-slate-50"
                    }`}
                    placeholder={
                      STATUSES_REQUIRING_REASON.has(replacementUpdate.status)
                        ? "Explain why you are rejecting this request."
                        : "Optional message shared with the customer."
                    }
                  />
                  {STATUSES_REQUIRING_REASON.has(replacementUpdate.status) ? (
                    <p className="mt-1 text-xs text-rose-500">
                      A reason is required when rejecting.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">
                      Optional message shared with the customer.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={
                  savingReplacement ||
                  (STATUSES_REQUIRING_REASON.has(replacementUpdate.status) &&
                    !(
                      replacementUpdate.notes && replacementUpdate.notes.trim()
                    ))
                }
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingReplacement ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4" /> Update request
                  </>
                )}
              </button>
            </div>
          </form>

          {replacementHistory.length > 0 && (
            <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ClipboardList className="h-4 w-4 text-sky-500" /> Activity
                timeline
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                {replacementHistory.map((entry, index) => (
                  <li
                    key={`${entry.at || index}-${entry.status}`}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${replacementTone.dot}`}
                    />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">
                        {formatReplacementStatus(entry.status)}
                      </p>
                      <p className="text-slate-500">
                        {entry.at ? new Date(entry.at).toLocaleString() : "--"}
                      </p>
                      {entry.note && (
                        <p className="rounded-lg bg-slate-50 p-2 text-slate-600">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <MapPin className="h-4 w-4" /> Shipping information
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p className="text-sm font-semibold text-slate-900">
              {order.shippingAddress?.fullName || "--"}
            </p>
            <p>{order.shippingAddress?.addressLine || "--"}</p>
            <p>
              {order.shippingAddress?.city || "--"},{" "}
              {order.shippingAddress?.state || "--"} -{" "}
              {order.shippingAddress?.pincode || "--"}
            </p>
            <p>Mobile: {order.shippingAddress?.mobile || "--"}</p>
            {order.shippingAddress?.alternatePhone && (
              <p>Alternate: {order.shippingAddress.alternatePhone}</p>
            )}
            <p>Email: {order.shippingAddress?.email || "--"}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">
              Payment summary
            </h3>
            {coupon?.code && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Coupon applied
              </span>
            )}
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>{formatCurrency(shippingFee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
};

export default SellerOrderDetailsPage;
