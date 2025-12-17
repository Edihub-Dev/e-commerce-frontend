import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import api, { fetchOrderById } from "../utils/api";
import {
  ArrowLeft,
  Download,
  Loader2,
  MapPin,
  PackageCheck,
  Truck,
  CreditCard,
  Receipt,
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
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                  - {order.shippingAddress?.pincode}
                </p>
                <p>Mobile: {order.shippingAddress?.mobile}</p>
                {order.shippingAddress?.alternatePhone && (
                  <p>Alternate: {order.shippingAddress.alternatePhone}</p>
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
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default SellerOrderDetailsPage;
