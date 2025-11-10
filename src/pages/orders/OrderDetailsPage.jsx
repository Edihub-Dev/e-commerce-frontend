import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchOrderById } from "../../utils/api";
import { toast } from "react-hot-toast";
import { ArrowLeft, Download, MapPin, PackageCheck } from "lucide-react";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAdminOrders = location.state?.from === "admin-orders";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      refunded: "Refunded",
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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [order?.estimatedDeliveryDate]);

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
          <div>
            <h1 className="text-2xl font-semibold text-secondary">
              Order #{order._id}
            </h1>
            <p className="text-sm text-medium-text">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary uppercase">
            {order.status?.replace(/_/g, " ")}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm text-medium-text">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-4 w-4 text-secondary" />
            <div>
              <p className="font-medium text-secondary">Items</p>
              <p>{order.items?.length || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-secondary" />
            <div>
              <p className="font-medium text-secondary">Estimated Delivery</p>
              <p>{deliveryDate}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-secondary">
          Items in your order
        </h2>
        <div className="space-y-4">
          {order.items?.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex gap-4">
              <div className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-secondary">{item.name}</p>
                <p className="text-sm text-medium-text mt-1">
                  Qty: {item.quantity}
                  {item.size && ` • Size: ${item.size}`}
                </p>
                <p className="text-sm text-medium-text mt-1">
                  Price: ₹{item.price.toLocaleString()} • Line Total: ₹
                  {(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-2 text-sm text-medium-text">
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
          <h3 className="text-lg font-semibold text-secondary mb-2">
            Payment Summary
          </h3>
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{order.pricing?.subtotal?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Fee</span>
            <span>₹{order.pricing?.shippingFee?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between">
            <span>Tax</span>
            <span>₹{order.pricing?.taxAmount?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between text-success font-medium">
            <span>Discount</span>
            <span>-₹{order.pricing?.discount?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between text-base font-semibold text-secondary border-t border-slate-200 pt-3">
            <span>Total</span>
            <span>₹{order.pricing?.total?.toLocaleString?.()}</span>
          </p>
          <p className="text-xs text-slate-400 pt-1">
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
        {/* <button
          type="button"
          onClick={handleDownloadCsv}
          className="px-5 py-3 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button> */}
        {order.invoiceUrl && (
          <a
            href={order.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl bg-primary text-white hover:bg-primary-dark inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Invoice
          </a>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
