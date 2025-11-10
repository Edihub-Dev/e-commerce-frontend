import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Filter,
  Eye,
  Trash2,
  Loader2,
  PencilLine,
  X,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api, { updateOrder as updateOrderRequest } from "../../utils/api";

const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const formatCurrency = (amount) => {
  const value =
    typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return `₹${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const statusBadgeClasses = {
  processing: "bg-orange-100 text-orange-600",
  shipped: "bg-blue-100 text-blue-600",
  out_for_delivery: "bg-blue-100 text-blue-600",
  delivered: "bg-green-100 text-green-600",
  cancelled: "bg-slate-100 text-slate-500",
  returned: "bg-slate-100 text-slate-500",
};

const paymentStatusClasses = {
  paid: "bg-emerald-100 text-emerald-600",
  pending: "bg-amber-100 text-amber-600",
  failed: "bg-rose-100 text-rose-600",
  refunded: "bg-slate-100 text-slate-500",
};

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

const orderStatusOptions = [
  { label: "Processing", value: "processing" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Shipped", value: "shipped" },
  { label: "Out for Delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Returned", value: "returned" },
];

const paymentStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Successful", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

const paymentMethodOptions = [
  { label: "Cash on Delivery", value: "cod" },
  { label: "UPI", value: "upi" },
  { label: "QR Code", value: "qr" },
  { label: "Card", value: "card" },
  { label: "Net Banking", value: "netbanking" },
];

const getStatusKey = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "confirmed") return "processing";
  return normalized;
};

const humanizeStatus = (status = "") => {
  const key = getStatusKey(status);
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const escapeCsvValue = (value) => {
  if (value === undefined || value === null) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const RecentOrdersTable = ({
  orders,
  isLoading,
  error,
  totalOrders,
  statusBreakdown,
  filters,
  appliedFilters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  onOrderDeleted,
  onOrderUpdated,
  onViewAll,
}) => {
  const navigate = useNavigate();
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    estimatedDeliveryDate: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editingOrder) return;
    const nextForm = {
      status: editingOrder.status || "processing",
      paymentStatus: editingOrder.payment?.status || "",
      paymentMethod: editingOrder.payment?.method || "",
      estimatedDeliveryDate: editingOrder.estimatedDeliveryDate
        ? new Date(editingOrder.estimatedDeliveryDate)
            .toISOString()
            .slice(0, 10)
        : "",
    };
    setEditForm(nextForm);
  }, [editingOrder]);

  const handleViewOrder = useCallback(
    (orderId) => {
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (!window.confirm("Are you sure you want to delete this order?")) {
        return;
      }

      setDeletingIds((prev) => new Set(prev).add(orderId));

      try {
        await api.delete(`/orders/${orderId}`);
        toast.success("Order deleted");
        onOrderDeleted?.(orderId);
      } catch (deleteError) {
        console.error("Failed to delete order", deleteError);
        const message =
          deleteError.response?.data?.message ||
          "Failed to delete order. Please try again.";
        toast.error(message);
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    },
    [onOrderDeleted]
  );

  const handleDownloadCsv = useCallback(() => {
    if (!orders.length) {
      toast.error("No orders to export yet");
      return;
    }

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

    const rows = orders.map((order) => {
      const customerName =
        order.customerName || order.shippingAddress?.fullName || "Customer";
      const customerEmail =
        order.customerEmail || order.shippingAddress?.email || "--";
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
      const totalAmount = order.totalAmount ?? order.pricing?.total ?? 0;
      const paymentStatus = order.payment?.status?.toLowerCase();
      const paymentMethod = order.payment?.method?.toLowerCase();

      return [
        order._id,
        order.createdAt ? new Date(order.createdAt).toISOString() : "",
        customerName,
        customerEmail,
        itemsSummary,
        Number(totalAmount).toFixed(2),
        humanizeStatus(order.status),
        paymentMethodLabels[paymentMethod] ||
          paymentMethod?.toUpperCase?.() ||
          "",
        paymentStatusLabels[paymentStatus] || paymentStatus || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recent-orders-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [orders]);

  const handleOpenEdit = useCallback((order) => {
    setEditingOrder(order);
  }, []);

  const handleCloseEdit = useCallback(() => {
    if (isSaving) return;
    setEditingOrder(null);
  }, [isSaving]);

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveOrder = async () => {
    if (!editingOrder) return;
    setIsSaving(true);
    try {
      const payload = {
        status: editForm.status || undefined,
        paymentStatus: editForm.paymentStatus || undefined,
        paymentMethod: editForm.paymentMethod || undefined,
        estimatedDeliveryDate: editForm.estimatedDeliveryDate || null,
      };

      const response = await updateOrderRequest(editingOrder._id, payload);
      const updatedOrder = response?.data || response;

      toast.success("Order updated successfully");
      onOrderUpdated?.(updatedOrder);
      setEditingOrder(null);
    } catch (error) {
      console.error("Failed to update order", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update order";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCount =
    typeof totalOrders === "number" ? totalOrders : orders.length;
  const statusChips = [
    {
      key: "processing",
      label: "Processing",
      className: "bg-orange-100 text-orange-600",
    },
    {
      key: "shipped",
      label: "Shipped",
      className: "bg-blue-100 text-blue-600",
    },
    {
      key: "delivered",
      label: "Delivered",
      className: "bg-green-100 text-green-600",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      className: "bg-slate-100 text-slate-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Orders
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Showing {orders.length} of {totalCount} orders
          </p>
          {(appliedFilters?.status ||
            appliedFilters?.startDate ||
            appliedFilters?.endDate) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {appliedFilters.status && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  Status: {appliedFilters.status}
                </span>
              )}
              {appliedFilters.startDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  From: {appliedFilters.startDate}
                </span>
              )}
              {appliedFilters.endDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                  To: {appliedFilters.endDate}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
            onClick={handleDownloadCsv}
          >
            <Download size={18} /> Download CSV
          </button>
          {onViewAll && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 transition"
              onClick={onViewAll}
            >
              View more
            </button>
          )}
          <form
            className="flex flex-wrap items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onApplyFilters();
            }}
          >
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">
              <Filter size={18} />
              <select
                value={filters.status}
                onChange={(event) =>
                  onFiltersChange({ status: event.target.value })
                }
                className="bg-transparent focus:outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">
              <Calendar size={18} />
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  onFiltersChange({ startDate: event.target.value })
                }
                className="bg-transparent focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">
              <Calendar size={18} />
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  onFiltersChange({ endDate: event.target.value })
                }
                className="bg-transparent focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Apply
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-blue-200 hover:text-blue-600 transition"
              onClick={onClearFilters}
            >
              Clear
            </button>
          </form>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-slate-400"
                >
                  Loading recent orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-slate-400"
                >
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const firstItem = order.items?.[0] || {};
                const productName =
                  order.productName || firstItem.name || "Unknown product";
                const productImage =
                  order.productImage ||
                  firstItem.image ||
                  "https://placehold.co/80x80/f8fafc/e2e8f0?text=IMG";
                const customerName =
                  order.customerName ||
                  order.shippingAddress?.fullName ||
                  "Customer";
                const customerEmail =
                  order.customerEmail || order.shippingAddress?.email || "--";
                const totalAmount =
                  order.totalAmount ?? order.pricing?.total ?? 0;
                const status = order.status || "processing";
                const statusKey = getStatusKey(status);
                const statusClass =
                  statusBadgeClasses[statusKey] ||
                  "bg-slate-100 text-slate-500";
                const paymentStatus = order.payment?.status?.toLowerCase();
                const paymentMethod = order.payment?.method?.toLowerCase();
                const paymentStatusClass =
                  paymentStatusClasses[paymentStatus] ||
                  "bg-slate-100 text-slate-500";

                return (
                  <tr
                    key={order._id}
                    className="hover:bg-slate-50/60 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={productImage}
                          alt={productName}
                          className="h-10 w-10 rounded-xl object-cover"
                          onError={(event) => {
                            event.target.onerror = null;
                            event.target.src =
                              "https://placehold.co/80x80/f8fafc/e2e8f0?text=IMG";
                          }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {productName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {order.items?.length > 1
                              ? `+${order.items.length - 1} other item${
                                  order.items.length - 1 > 1 ? "s" : ""
                                }`
                              : firstItem.size
                              ? `Size: ${firstItem.size}`
                              : "Single item"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {customerEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex flex-col gap-2">
                        <span className="font-medium text-slate-700">
                          {paymentMethodLabels[paymentMethod] ||
                            paymentMethod?.toUpperCase?.() ||
                            "--"}
                        </span>
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${paymentStatusClass}`}
                        >
                          {paymentStatusLabels[paymentStatus] ||
                            paymentStatus?.replace(/_/g, " ") ||
                            "--"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                      >
                        {humanizeStatus(status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-400">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition"
                          aria-label="View order"
                          onClick={() => handleViewOrder(order._id)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-full hover:bg-purple-50 text-purple-600 transition"
                          aria-label="Edit order"
                          onClick={() => handleOpenEdit(order)}
                        >
                          <PencilLine size={18} />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-full hover:bg-red-50 text-red-500 transition disabled:opacity-50"
                          aria-label="Delete order"
                          onClick={() => handleDeleteOrder(order._id)}
                          disabled={deletingIds.has(order._id)}
                        >
                          {deletingIds.has(order._id) ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 px-4 md:hidden">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading recent orders...
              </div>
            </motion.div>
          )}

          {!isLoading && error && (
            <motion.div
              className="rounded-2xl border border-rose-200 bg-white p-6 text-center text-rose-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}

          {!isLoading && !error && orders.length === 0 && (
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No orders found.
            </motion.div>
          )}

          {!isLoading &&
            !error &&
            orders.map((order) => {
              const firstItem = order.items?.[0] || {};
              const productName =
                order.productName || firstItem.name || "Unknown product";
              const productImage =
                order.productImage ||
                firstItem.image ||
                "https://placehold.co/80x80/f8fafc/e2e8f0?text=IMG";
              const customerName =
                order.customerName ||
                order.shippingAddress?.fullName ||
                "Customer";
              const totalAmount =
                order.totalAmount ?? order.pricing?.total ?? 0;
              const status = order.status || "processing";
              const statusKey = getStatusKey(status);
              const statusClass =
                statusBadgeClasses[statusKey] || "bg-slate-100 text-slate-500";
              const paymentStatus = order.payment?.status?.toLowerCase();
              const paymentMethod = order.payment?.method?.toLowerCase();
              const paymentStatusClass =
                paymentStatusClasses[paymentStatus] ||
                "bg-slate-100 text-slate-500";

              return (
                <motion.div
                  key={order._id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={productImage}
                      alt={productName}
                      className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                      onError={(event) => {
                        event.currentTarget.src =
                          "https://placehold.co/80x80/f8fafc/e2e8f0?text=IMG";
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-slate-900">
                          {productName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {customerName}
                        </span>
                        <span className="text-xs text-slate-400">
                          Order ID: {order._id}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="uppercase text-[10px] tracking-wide text-slate-400">
                            Total
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatCurrency(totalAmount)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="uppercase text-[10px] tracking-wide text-slate-400">
                            Payment
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {paymentMethodLabels[paymentMethod] ||
                              paymentMethod?.toUpperCase?.() ||
                              "--"}
                          </p>
                          <span
                            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentStatusClass}`}
                          >
                            {paymentStatusLabels[paymentStatus] ||
                              paymentStatus?.replace(/_/g, " ") ||
                              "--"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="uppercase text-[10px] tracking-wide text-slate-400">
                            Status
                          </p>
                          <span
                            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}
                          >
                            {humanizeStatus(status)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="uppercase text-[10px] tracking-wide text-slate-400">
                            Placed on
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "--"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewOrder(order._id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(order)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-purple-200 hover:text-purple-600"
                        >
                          <PencilLine size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order._id)}
                          disabled={deletingIds.has(order._id)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:border-rose-300 disabled:opacity-60"
                        >
                          {deletingIds.has(order._id) ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <p>
            Showing {orders.length} {orders.length === 1 ? "order" : "orders"}
            {totalCount > orders.length ? ` of ${totalCount}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {statusChips.map(({ key, label, className }) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${className}`}
              >
                {label}: {statusBreakdown?.[key] ?? 0}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              className={`h-9 w-9 rounded-full border text-sm font-medium transition ${
                page === 1
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            className="h-9 w-9 rounded-full border border-slate-200 text-slate-400"
            aria-label="Next page"
          >
            ...
          </button>
        </div>
      </div>
      <AnimatePresence>
        {editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    Edit Order
                  </h4>
                  <p className="text-xs text-slate-500">
                    Order #{editingOrder._id}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                  onClick={handleCloseEdit}
                  aria-label="Close edit order"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Order Status
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      handleEditFieldChange("status", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {orderStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Status
                    <select
                      value={editForm.paymentStatus}
                      onChange={(event) =>
                        handleEditFieldChange(
                          "paymentStatus",
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Keep unchanged</option>
                      {paymentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Payment Method
                    <select
                      value={editForm.paymentMethod}
                      onChange={(event) =>
                        handleEditFieldChange(
                          "paymentMethod",
                          event.target.value
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Keep unchanged</option>
                      {paymentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Estimated Delivery Date
                  <input
                    type="date"
                    value={editForm.estimatedDeliveryDate}
                    onChange={(event) =>
                      handleEditFieldChange(
                        "estimatedDeliveryDate",
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={handleCloseEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  onClick={handleSaveOrder}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

RecentOrdersTable.propTypes = {
  orders: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      productName: PropTypes.string,
      productImage: PropTypes.string,
      customerName: PropTypes.string,
      customerEmail: PropTypes.string,
      items: PropTypes.array,
      shippingAddress: PropTypes.shape({
        fullName: PropTypes.string,
        email: PropTypes.string,
      }),
      pricing: PropTypes.shape({
        total: PropTypes.number,
      }),
      totalAmount: PropTypes.number,
      status: PropTypes.string,
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  totalOrders: PropTypes.number,
  statusBreakdown: PropTypes.shape({
    processing: PropTypes.number,
    shipped: PropTypes.number,
    delivered: PropTypes.number,
    cancelled: PropTypes.number,
  }),
  onOrderDeleted: PropTypes.func,
  onOrderUpdated: PropTypes.func,
  onViewAll: PropTypes.func,
};

RecentOrdersTable.defaultProps = {
  orders: [],
  isLoading: false,
  error: "",
  totalOrders: 0,
  statusBreakdown: {
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  },
  filters: {
    status: "",
    startDate: "",
    endDate: "",
  },
  appliedFilters: {
    status: "",
    startDate: "",
    endDate: "",
  },
  onFiltersChange: () => {},
  onApplyFilters: () => {},
  onClearFilters: () => {},
  onOrderDeleted: () => {},
  onOrderUpdated: () => {},
};

export default RecentOrdersTable;
