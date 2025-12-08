import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-hot-toast";
import useSocket from "../hooks/useSocket";
import api, {
  fetchOrderById,
  adminUpdateReplacementRequest,
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
  RotateCcw,
  ClipboardCheck,
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

const AdminOrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const socketUrl = useMemo(() => {
    const socketEnv = import.meta.env.VITE_SOCKET_URL;
    if (socketEnv) return socketEnv;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    return apiBase.replace(/\/?api\/?$/, "");
  }, []);

  const socketEnabled = useMemo(() => {
    const flag = import.meta.env.VITE_SOCKET_ENABLED;
    if (typeof flag === "string") {
      return flag.toLowerCase() === "true";
    }
    return false;
  }, []);

  const socketRef = useSocket(socketUrl, {
    withCredentials: true,
    enabled: socketEnabled,
  });

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

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !orderId) return undefined;

    const room = "admin:orders";

    const handleUpdate = (payload = {}) => {
      const updatedId = payload.id || payload._id;
      if (updatedId && String(updatedId) === String(orderId)) {
        loadOrder();
      }
    };

    socket.emit("joinRoom", room);
    socket.on("order:updated", handleUpdate);
    socket.on("order:created", handleUpdate);
    socket.on("order:deleted", handleUpdate);

    return () => {
      socket.emit("leaveRoom", room);
      socket.off("order:updated", handleUpdate);
      socket.off("order:created", handleUpdate);
      socket.off("order:deleted", handleUpdate);
    };
  }, [socketRef, orderId, loadOrder]);

  const handleBack = () => {
    navigate("/admin/orders");
  };

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Loading order details...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-center text-slate-600">
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          active="Orders"
          className="hidden md:flex md:w-64"
          onNavigate={() => setIsSidebarOpen(false)}
        />

        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <div className="relative z-50 h-full w-72 max-w-[85%] origin-left animate-slide-in bg-white shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Navigation
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                    aria-label="Close navigation"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <Sidebar
                    active="Orders"
                    className="flex w-full md:hidden"
                    onNavigate={() => setIsSidebarOpen(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex w-full flex-1 flex-col">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            showRangeSelector={false}
            showNotifications={false}
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to orders
                </button>

                <div className="flex flex-wrap items-center gap-3">
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
                  {order.replacementRequest &&
                    order.replacementRequest.status &&
                    order.replacementRequest.status !== "none" && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h2 className="text-lg font-semibold text-primary">
                              Return & Replace request
                            </h2>
                            <p className="text-xs text-primary/70">
                              Requested on{" "}
                              {formatDateTime(
                                order.replacementRequest.requestedAt
                              )}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-3 py-1 text-xs font-medium text-primary">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            {order.replacementRequest.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </motion.div>
                    )}
                </div>
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
                  Order items
                </h2>
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
                            <p className="text-xs text-slate-500">
                              Size: {item.size}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span>Qty: {item.quantity}</span>
                        <span>Price: {formatCurrency(item.price)}</span>
                        <span>
                          Total: {formatCurrency(item.price * item.quantity)}
                        </span>
                        {item.ratedAt && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                            Rated {item.rating ?? 0}/5
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-500">
                      No items recorded for this order.
                    </div>
                  )}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Delivery address
                  </h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {order.shippingAddress?.fullName}
                        </p>
                        <p>{order.shippingAddress?.addressLine}</p>
                        <p>
                          {order.shippingAddress?.city},{" "}
                          {order.shippingAddress?.state} -{" "}
                          {order.shippingAddress?.pincode}
                        </p>
                        <p>Mobile: {order.shippingAddress?.mobile}</p>
                        {order.shippingAddress?.alternatePhone && (
                          <p>
                            Alternate: {order.shippingAddress.alternatePhone}
                          </p>
                        )}
                        <p>Email: {order.shippingAddress?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                    <div className="text-xs text-slate-500">
                      Transaction ID: {order.payment?.transactionId || "--"}
                    </div>
                  </div>
                </div>
              </section>

              {order.replacementRequest &&
                order.replacementRequest.status &&
                order.replacementRequest.status !== "none" && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Return & Replace request
                    </h3>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleQuickDecision("approved")}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Approve request
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDecision("rejected")}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Reject request
                      </button>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 text-sm text-slate-600">
                        <h3 className="text-sm font-semibold text-primary">
                          Item details
                        </h3>
                        <p className="font-medium text-slate-900">
                          {order.replacementRequest.itemName}
                          {order.replacementRequest.itemSize &&
                            ` • Size ${order.replacementRequest.itemSize}`}
                        </p>
                        <p>
                          Quantity: {order.replacementRequest.quantity || 1}
                        </p>
                        {order.replacementRequest.issueDescription && (
                          <p className="rounded-xl border border-primary/20 bg-white p-3 text-sm text-slate-700">
                            {order.replacementRequest.issueDescription}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <h3 className="text-sm font-semibold text-primary">
                          Replacement preferences
                        </h3>
                        <p>
                          Size:{" "}
                          {order.replacementRequest.replacementPreferences
                            ?.size || "--"}
                        </p>
                        <p>
                          Color:{" "}
                          {order.replacementRequest.replacementPreferences
                            ?.color || "--"}
                        </p>
                        <p>
                          Notes:{" "}
                          {order.replacementRequest.replacementPreferences
                            ?.remarks || "--"}
                        </p>
                        {order.replacementRequest.adminNotes && (
                          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                            Admin notes: {order.replacementRequest.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>

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
                            handleReplacementFieldChange(
                              "status",
                              event.target.value
                            )
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
                              event.target.value
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
                              event.target.value
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
                            handleReplacementFieldChange(
                              "notes",
                              event.target.value
                            )
                          }
                          rows={3}
                          ref={notesRef}
                          required={STATUSES_REQUIRING_REASON.has(
                            replacementUpdate.status
                          )}
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-primary focus:outline-none ${
                            STATUSES_REQUIRING_REASON.has(
                              replacementUpdate.status
                            )
                              ? "border-rose-200"
                              : "border-primary/30"
                          }`}
                          placeholder={
                            STATUSES_REQUIRING_REASON.has(
                              replacementUpdate.status
                            )
                              ? "Explain why you are rejecting this request."
                              : "Share updates or next actions (optional)."
                          }
                        />
                        {STATUSES_REQUIRING_REASON.has(
                          replacementUpdate.status
                        ) ? (
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
                              replacementUpdate.status
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
                              <Loader2 className="h-4 w-4 animate-spin" />{" "}
                              Saving...
                            </>
                          ) : (
                            <>
                              <ClipboardCheck className="h-4 w-4" /> Update
                              request
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </section>
                )}

              {Array.isArray(order.replacementRequest.history) &&
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
                            className="flex items-start gap-2"
                          >
                            <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-primary" />
                            <div>
                              <p className="font-semibold text-slate-800">
                                {entry.status?.replace(/_/g, " ") || "Update"}
                              </p>
                              <p>{entry.note || "Status updated"}</p>
                              <p className="text-[10px] text-slate-400">
                                {formatDateTime(entry.at)}
                                {entry.actor ? ` • by ${entry.actor}` : ""}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailsPage;
