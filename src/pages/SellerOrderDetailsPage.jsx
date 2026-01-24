import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import api, {
  adminUpdateReplacementRequest,
  fetchOrderById,
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
  ClipboardCheck,
  RotateCcw,
} from "lucide-react";

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

const REPLACEMENT_STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pickup_completed", label: "Pickup completed" },
  { value: "replacement_processing", label: "Replacement processing" },
  { value: "replacement_shipped", label: "Replacement shipped" },
  { value: "replacement_out_for_delivery", label: "Out for delivery" },
  { value: "replacement_delivered", label: "Replacement delivered" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUSES_REQUIRING_REASON = new Set(["rejected"]);

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

const buildTrackingUrl = (courier, trackingId) => {
  if (!trackingId) return null;
  const normalizedCourier = String(courier || "")
    .trim()
    .toLowerCase();
  const encodedId = encodeURIComponent(trackingId.trim());

  if (normalizedCourier === "triupati" || normalizedCourier === "tirupati") {
    return `https://trackcourier.io/track-and-trace/tirupati-courier/${encodedId}`;
  }

  if (normalizedCourier.includes("xpressbees")) {
    return `https://trackcourier.io/track-and-trace/xpressbees-logistics/${encodedId}`;
  }

  if (normalizedCourier.includes("delhivery")) {
    return `https://trackcourier.io/track-and-trace/delhivery-courier/${encodedId}`;
  }

  return null;
};

const SellerOrderDetailsPage = ({
  allowReplacementActions: allowReplacementActionsProp,
} = {}) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  const allowReplacementActions =
    allowReplacementActionsProp ??
    location.state?.allowReplacementActions ??
    true;

  const isSubadminRoute = location.pathname.startsWith("/subadmin");
  const fallbackReturnTo =
    location.state?.returnTo ||
    (isSubadminRoute && sellerId
      ? `/subadmin/sellers/${sellerId}`
      : "/seller/orders");
  const returnState = location.state?.returnState;
  const returnLabel =
    location.state?.returnLabel ||
    (isSubadminRoute ? "Back to seller orders" : "Back to orders");

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
    navigate(fallbackReturnTo, { state: returnState });
  };

  const paymentStatus = (order?.payment?.status || "pending").toLowerCase();
  const isPaymentPaid = paymentStatus === "paid";
  const invoiceUrl = order?.invoice?.url || order?.invoiceUrl;
  const isInvoiceAvailable = Boolean(invoiceUrl);
  const canDownloadInvoice = isPaymentPaid || isInvoiceAvailable;

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

  const handleQuickDecision = (status) => {
    if (!allowReplacementActions) {
      return;
    }
    setReplacementUpdate((prev) => ({
      ...prev,
      status,
      notes: STATUSES_REQUIRING_REASON.has(status) ? "" : prev.notes,
    }));
    if (STATUSES_REQUIRING_REASON.has(status)) {
      setTimeout(() => {
        notesRef.current?.focus();
        toast("Add a reason before submitting your decision.");
      }, 0);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order?._id) {
      toast.error("Order details unavailable");
      return;
    }

    if (!canDownloadInvoice) {
      toast.error(
        "Invoice will be available once payment is successful or the invoice is generated.",
      );
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

  const handleSubmitReplacementUpdate = async (event) => {
    event.preventDefault();
    if (!allowReplacementActions || !order?._id) return;

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

      const response = await adminUpdateReplacementRequest(order._id, payload);
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
    [order?.estimatedDeliveryDate],
  );

  const subtotal = order?.pricing?.subtotal ?? 0;
  const shippingFee = order?.pricing?.shippingFee ?? 0;
  const taxAmount = order?.pricing?.taxAmount ?? 0;
  const discount = order?.pricing?.discount ?? 0;
  const total = order?.pricing?.total ?? 0;
  const coupon = order?.coupon;
  const couponCode = typeof coupon?.code === "string" ? coupon.code.trim() : "";

  const items = Array.isArray(order?.items) ? order.items : [];
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
          <ArrowLeft className="h-4 w-4" /> {returnLabel}
        </button>
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={downloadingInvoice || !canDownloadInvoice}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          title={
            canDownloadInvoice
              ? undefined
              : "Invoice will be available once payment is successful or the invoice is generated."
          }
        >
          {downloadingInvoice ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {canDownloadInvoice ? "Download invoice" : "Invoice locked"}
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
        <h2 className="text-lg font-semibold text-slate-900">
          Tracking Updates
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Tracking ID:{" "}
          {order?.shipping?.trackingId ? (
            <a
              href={
                buildTrackingUrl(
                  order?.shipping?.courier,
                  order.shipping.trackingId,
                ) || undefined
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 underline-offset-4 hover:underline"
            >
              {order.shipping.trackingId}
            </a>
          ) : (
            "To be assigned"
          )}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Courier: {order?.shipping?.courier || "Triupati"}
        </p>
      </section>

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
            {couponCode && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Coupon: {couponCode}
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

      {order.replacementRequest &&
        order.replacementRequest.status &&
        order.replacementRequest.status !== "none" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Return & Replace request
              </h3>
              {allowReplacementActions ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDecision("approved")}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <ClipboardCheck className="h-4 w-4" /> Approve request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDecision("rejected")}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <RotateCcw className="h-4 w-4" /> Reject request
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm text-slate-600">
                <h4 className="text-sm font-semibold text-primary">
                  Item details
                </h4>
                <p className="font-medium text-slate-900">
                  {order.replacementRequest.itemName}
                  {order.replacementRequest.itemSize &&
                    ` • Size ${order.replacementRequest.itemSize}`}
                </p>
                <p>Quantity: {order.replacementRequest.quantity || 1}</p>
                {order.replacementRequest.issueDescription && (
                  <p className="rounded-xl border border-primary/20 bg-white p-3 text-sm text-slate-700">
                    {order.replacementRequest.issueDescription}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <h4 className="text-sm font-semibold text-primary">
                  Replacement preferences
                </h4>
                <p>
                  Size:{" "}
                  {order.replacementRequest.replacementPreferences?.size ||
                    "--"}
                </p>
                <p>
                  Color:{" "}
                  {order.replacementRequest.replacementPreferences?.color ||
                    "--"}
                </p>
                <p>
                  Notes:{" "}
                  {order.replacementRequest.replacementPreferences?.remarks ||
                    "--"}
                </p>
                {order.replacementRequest.adminNotes && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    Seller notes: {order.replacementRequest.adminNotes}
                  </p>
                )}
              </div>
            </div>

            {allowReplacementActions ? (
              <form
                className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]"
                onSubmit={handleSubmitReplacementUpdate}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary">
                    Update status
                  </label>
                  <select
                    value={replacementUpdate.status}
                    onChange={(event) =>
                      handleReplacementFieldChange("status", event.target.value)
                    }
                    className="w-full rounded-xl border border-primary/30 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  >
                    {REPLACEMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary">
                    Courier (optional)
                  </label>
                  <input
                    value={replacementUpdate.courier}
                    onChange={(event) =>
                      handleReplacementFieldChange(
                        "courier",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-primary/30 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Delhivery"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary">
                    Tracking ID (optional)
                  </label>
                  <input
                    value={replacementUpdate.trackingId}
                    onChange={(event) =>
                      handleReplacementFieldChange(
                        "trackingId",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-primary/30 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. AWB123456"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-primary">
                    Notes for customer
                  </label>
                  <textarea
                    value={replacementUpdate.notes}
                    onChange={(event) =>
                      handleReplacementFieldChange("notes", event.target.value)
                    }
                    rows={3}
                    ref={notesRef}
                    required={STATUSES_REQUIRING_REASON.has(
                      replacementUpdate.status,
                    )}
                    className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-primary focus:outline-none ${
                      STATUSES_REQUIRING_REASON.has(replacementUpdate.status)
                        ? "border-rose-200"
                        : "border-primary/30"
                    }`}
                    placeholder={
                      STATUSES_REQUIRING_REASON.has(replacementUpdate.status)
                        ? "Explain why you are rejecting this request."
                        : "Share updates or next actions (optional)."
                    }
                  />
                  {STATUSES_REQUIRING_REASON.has(replacementUpdate.status) ? (
                    <p className="text-xs text-rose-500">
                      A reason is required when rejecting.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Optional message shared with the customer.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
                  <button
                    type="submit"
                    disabled={
                      savingReplacement ||
                      (STATUSES_REQUIRING_REASON.has(
                        replacementUpdate.status,
                      ) &&
                        !(
                          replacementUpdate.notes &&
                          replacementUpdate.notes.trim()
                        ))
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
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
            ) : (
              <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Replacement workflow is read-only in coordinator view.
              </p>
            )}
          </section>
        )}

      {Array.isArray(order.replacementRequest?.history) &&
        order.replacementRequest.history.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Activity log
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              {order.replacementRequest.history
                .slice()
                .reverse()
                .map((entry, index) => (
                  <li
                    key={`${entry.at || index}-${entry.status}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold capitalize">
                        {entry.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {entry.at
                          ? new Date(entry.at).toLocaleString("en-IN")
                          : "--"}
                      </span>
                    </div>
                    {entry.note ? (
                      <p className="mt-1 text-[12px] text-slate-600">
                        {entry.note}
                      </p>
                    ) : null}
                    {entry.actor ? (
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                        Actor: {entry.actor}
                      </p>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        )}
    </motion.div>
  );
};

export default SellerOrderDetailsPage;
