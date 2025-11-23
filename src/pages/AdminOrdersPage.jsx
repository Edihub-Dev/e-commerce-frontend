import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchAdminOrdersThunk } from "../store/thunks/adminOrdersThunks";
import {
  setFilters,
  resetFilters,
  setSelectedDetails,
  setSort,
  setPage,
  setLimit,
  toggleSelectAll,
  toggleSelectRow,
  clearSelection,
} from "../store/slices/adminOrdersSlice";
import {
  Calendar,
  Download,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
  Truck,
  ClipboardList,
  CheckCircle2,
  Ban,
  PencilLine,
  X,
  CreditCard,
} from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { utils as XLSXUtils, writeFile as writeXlsxFile } from "xlsx";
import jsPDF from "jspdf";
import { toast } from "react-hot-toast";
import useSocket from "../hooks/useSocket";
import {
  deleteAdminOrder,
  deleteAdminOrdersBulk,
} from "../services/adminOrdersApi";
import api, { updateOrder as updateOrderRequest } from "../utils/api";

const STATUS_LABELS = {
  processing: {
    label: "Processing",
    className: "bg-orange-100 text-orange-600",
  },
  confirmed: { label: "Confirmed", className: "bg-orange-100 text-orange-600" },
  shipped: { label: "Shipped", className: "bg-blue-100 text-blue-600" },
  out_for_delivery: {
    label: "Out for Delivery",
    className: "bg-indigo-100 text-indigo-600",
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-100 text-emerald-600",
  },
  returned: { label: "Returned", className: "bg-rose-100 text-rose-600" },
};

const SUMMARY_CONFIG = [
  {
    key: "processing",
    label: "Processing Orders",
    icon: ClipboardList,
    iconClasses: "bg-amber-100 text-amber-600",
  },
  {
    key: "shipped",
    label: "Shipped Orders",
    icon: Truck,
    iconClasses: "bg-sky-100 text-sky-600",
  },
  {
    key: "paid",
    label: "Paid Orders",
    icon: CreditCard,
    iconClasses: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "delivered",
    label: "Delivered Orders",
    icon: CheckCircle2,
    iconClasses: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "returned",
    label: "Return/Replace",
    icon: Ban,
    iconClasses: "bg-rose-100 text-rose-600",
  },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Return / Replace" },
];

const formatCurrency = (value) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
};

const formatDate = (date) => {
  if (!date) return "--";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
};

const transformOrdersForExport = (orders = []) =>
  orders.map((order) => {
    const firstItem = order.items?.[0];
    return {
      "Order ID": order._id,
      Customer:
        order.customerName || order.shippingAddress?.fullName || "Customer",
      Email: order.customerEmail || order.shippingAddress?.email || "",
      Status:
        STATUS_LABELS[String(order.status || "").toLowerCase()]?.label || "--",
      "Primary Product": firstItem?.name || "--",
      Quantity: firstItem?.quantity || order.items?.length || 0,
      Total: order.totalAmount ?? order.pricing?.total ?? order.grandTotal ?? 0,
      Created: order.createdAt
        ? new Date(order.createdAt).toLocaleString()
        : "--",
    };
  });

const AddOrderModal = ({ isOpen, onClose, onSubmit }) => {
  const [formState, setFormState] = useState({
    customerName: "",
    customerEmail: "",
    totalAmount: "",
    status: "processing",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormState({
        customerName: "",
        customerEmail: "",
        totalAmount: "",
        status: "processing",
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!formState.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!formState.customerEmail.trim()) {
      toast.error("Customer email is required");
      return;
    }
    if (!formState.totalAmount || Number.isNaN(Number(formState.totalAmount))) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.({
        customerName: formState.customerName.trim(),
        customerEmail: formState.customerEmail.trim(),
        totalAmount: Number(formState.totalAmount),
        status: formState.status,
      });
      toast.success("Order draft captured");
      onClose();
    } catch (error) {
      console.error("Failed to create order draft", error);
      toast.error(error?.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Add Order
                </h2>
                <p className="text-sm text-slate-500">
                  Capture a quick order draft. Full admin order creation API is
                  coming soon.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-600"
                  htmlFor="customerName"
                >
                  Customer Name
                </label>
                <input
                  id="customerName"
                  name="customerName"
                  value={formState.customerName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-600"
                  htmlFor="customerEmail"
                >
                  Customer Email
                </label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={formState.customerEmail}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="customer@mail.com"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-600"
                    htmlFor="totalAmount"
                  >
                    Total Amount (INR)
                  </label>
                  <input
                    id="totalAmount"
                    name="totalAmount"
                    value={formState.totalAmount}
                    onChange={handleChange}
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="₹4999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-600"
                    htmlFor="status"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formState.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  >
                    {STATUS_OPTIONS.filter((option) => option.value).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : "Save Draft"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

AddOrderModal.defaultProps = {
  onSubmit: undefined,
};

const SelectionDetailsModal = ({ isOpen, onClose, orders, renderStatus }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Selected orders ({orders.length})
              </h2>
              <p className="text-sm text-slate-500">
                Review the highlighted orders before taking bulk actions.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Primary product</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {orders.map((order) => {
                  const firstItem = order.items?.[0];
                  return (
                    <tr key={order._id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        #{order._id}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {order.customerName ||
                            order.shippingAddress?.fullName ||
                            "Customer"}
                        </p>
                        {order.customerEmail && (
                          <p className="text-xs text-slate-500">
                            {order.customerEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {firstItem?.name || "Product"}
                        </p>
                        {order.items?.length > 1 && (
                          <p className="text-xs text-slate-500">
                            + {order.items.length - 1} more
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(
                          order.totalAmount ??
                            order.pricing?.total ??
                            order.grandTotal ??
                            0
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {renderStatus?.(order.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

SelectionDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  orders: PropTypes.arrayOf(PropTypes.object).isRequired,
  renderStatus: PropTypes.func,
};

SelectionDetailsModal.defaultProps = {
  renderStatus: undefined,
};

const AdminOrdersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { items, loading, error, filters, sort, meta, summary, selection } =
    useAppSelector((state) => state.adminOrders);

  const [searchValue, setSearchValue] = useState(filters.search);
  const [statusValue, setStatusValue] = useState(filters.status || "");
  const [startDateValue, setStartDateValue] = useState(() =>
    filters.dateRange?.startDate ? new Date(filters.dateRange.startDate) : null
  );
  const [endDateValue, setEndDateValue] = useState(() =>
    filters.dateRange?.endDate ? new Date(filters.dateRange.endDate) : null
  );
  const [minAmountValue, setMinAmountValue] = useState(
    filters.amountRange?.min || ""
  );
  const [maxAmountValue, setMaxAmountValue] = useState(
    filters.amountRange?.max || ""
  );
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSelectionDetailsOpen, setIsSelectionDetailsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    estimatedDeliveryDate: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const latestParamsRef = useRef({});

  const socketUrl = useMemo(() => {
    const socketEnv = import.meta.env.VITE_SOCKET_URL;
    if (socketEnv) return socketEnv;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    return apiBase.replace(/\/?api\/?$/, "");
  }, []);

  const socketRef = useSocket(socketUrl, {
    withCredentials: true,
  });

  const page = meta.page ?? 1;
  const limit = meta.limit ?? 10;
  const total = meta.total ?? items.length ?? 0;
  const totalPages = meta.totalPages || Math.max(Math.ceil(total / limit), 1);

  useEffect(() => {
    setSearchValue(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    setStatusValue(filters.status || "");
  }, [filters.status]);

  useEffect(() => {
    const normalizedSearch = searchValue.trim();
    const currentFilterValue = (filters.search || "").trim();
    if (normalizedSearch === currentFilterValue) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      dispatch(setFilters({ search: normalizedSearch }));
      dispatch(setPage(1));
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [dispatch, searchValue, filters.search]);

  useEffect(() => {
    const nextStart = filters.dateRange?.startDate
      ? new Date(filters.dateRange.startDate)
      : null;
    const nextEnd = filters.dateRange?.endDate
      ? new Date(filters.dateRange.endDate)
      : null;
    setStartDateValue(nextStart);
    setEndDateValue(nextEnd);
  }, [filters.dateRange?.startDate, filters.dateRange?.endDate]);

  useEffect(() => {
    setMinAmountValue(filters.amountRange?.min || "");
    setMaxAmountValue(filters.amountRange?.max || "");
  }, [filters.amountRange?.min, filters.amountRange?.max]);

  useEffect(() => {
    const params = {
      search: filters.search || undefined,
      status: filters.status || undefined,
      startDate: filters.dateRange?.startDate || undefined,
      endDate: filters.dateRange?.endDate || undefined,
      minAmount: filters.amountRange?.min || undefined,
      maxAmount: filters.amountRange?.max || undefined,
      sortField: sort.field,
      sortOrder: sort.order,
      page,
      limit,
    };
    latestParamsRef.current = params;
    dispatch(fetchAdminOrdersThunk(params));
  }, [
    dispatch,
    filters.search,
    filters.status,
    filters.dateRange?.startDate,
    filters.dateRange?.endDate,
    filters.amountRange?.min,
    filters.amountRange?.max,
    sort.field,
    sort.order,
    page,
    limit,
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const room = "admin:orders";

    const refetchOrders = () => {
      const params = latestParamsRef.current;
      if (params) {
        dispatch(fetchAdminOrdersThunk(params));
      }
    };

    const handleOrderCreated = (payload) => {
      toast.success(
        `New order received${
          payload?.customerName ? ` from ${payload.customerName}` : ""
        }`
      );
      refetchOrders();
    };

    const handleOrderUpdated = (payload) => {
      if (payload?.status) {
        toast(`Order ${payload.id} updated to ${payload.status}`, {
          icon: "🔄",
        });
      } else {
        toast(`Order ${payload?.id || ""} updated`, { icon: "🔄" });
      }
      refetchOrders();
    };

    const handleOrderDeleted = (payload) => {
      toast(`Order ${payload?.id || ""} removed`, { icon: "🗑️" });
      refetchOrders();
    };

    socket.emit("joinRoom", room);
    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("order:deleted", handleOrderDeleted);

    return () => {
      socket.emit("leaveRoom", room);
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order:deleted", handleOrderDeleted);
    };
  }, [dispatch, socketRef]);

  const summaryCards = useMemo(
    () =>
      SUMMARY_CONFIG.map(({ key, label, icon, iconClasses }) => ({
        key,
        label,
        icon,
        iconClasses,
        value: summary?.[key] ?? 0,
      })),
    [summary]
  );

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  const handleSearch = useCallback(
    (event) => {
      event.preventDefault();
      dispatch(setFilters({ search: searchValue.trim() }));
      dispatch(setPage(1));
    },
    [dispatch, searchValue]
  );

  const handleReset = () => {
    setSearchValue("");
    setStatusValue("");
    setStartDateValue(null);
    setEndDateValue(null);
    setMinAmountValue("");
    setMaxAmountValue("");
    dispatch(resetFilters());
  };

  const handleSelectAll = (event) => {
    dispatch(toggleSelectAll({ selectAll: event.target.checked }));
  };

  const handleRowToggle = useCallback(
    (id) => {
      dispatch(toggleSelectRow({ id }));
    },
    [dispatch]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const body = document.body;
    const html = document.documentElement;
    const originalBodyOverflow = body.style.overflow;
    const originalHtmlOverflow = html.style.overflow;

    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const applyOverflow = (matches) => {
      if (matches) {
        body.style.overflow = "hidden";
        html.style.overflow = "hidden";
      } else {
        body.style.overflow = originalBodyOverflow;
        html.style.overflow = originalHtmlOverflow;
      }
    };

    applyOverflow(mediaQuery.matches);

    const listener = (event) => {
      applyOverflow(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", listener);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(listener);
      }
      body.style.overflow = originalBodyOverflow;
      html.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleSortChange = (event) => {
    const [field, order] = event.target.value.split(":");
    dispatch(setSort({ field, order }));
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    dispatch(setPage(nextPage));
    dispatch(clearSelection());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (event) => {
    dispatch(setLimit(Number(event.target.value)));
    dispatch(clearSelection());
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setStatusValue(value);
    dispatch(setFilters({ status: value }));
  };

  const handleStartDateChange = (date) => {
    setStartDateValue(date);
    dispatch(
      setFilters({
        dateRange: {
          startDate: date ? date.toISOString() : "",
          endDate: filters.dateRange?.endDate || "",
        },
      })
    );
  };

  const handleEndDateChange = (date) => {
    setEndDateValue(date);
    dispatch(
      setFilters({
        dateRange: {
          startDate: filters.dateRange?.startDate || "",
          endDate: date ? date.toISOString() : "",
        },
      })
    );
  };

  const handleAmountChange = (type, value) => {
    const sanitized = value.replace(/[^0-9.]/g, "");

    if (type === "min") {
      setMinAmountValue(sanitized);
      dispatch(
        setFilters({
          amountRange: {
            min: sanitized,
            max: maxAmountValue,
          },
        })
      );
    } else {
      setMaxAmountValue(sanitized);
      dispatch(
        setFilters({
          amountRange: {
            min: minAmountValue,
            max: sanitized,
          },
        })
      );
    }
  };

  const handleExportCsv = () => {
    const rows = transformOrdersForExport(items);
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const header = Object.keys(rows[0]);
    const csvContent = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((key) => {
            const value = row[key] ?? "";
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}`.concat('"');
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleExportXlsx = () => {
    const rows = transformOrdersForExport(items);
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const worksheet = XLSXUtils.json_to_sheet(rows);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, "Orders");
    writeXlsxFile(
      workbook,
      `orders-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("XLSX exported");
  };

  const handleExportPdf = () => {
    const rows = transformOrdersForExport(items);
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Orders Summary", 14, 18);

    const header = Object.keys(rows[0]);
    const startY = 26;
    const rowHeight = 8;
    const colWidth = 40;

    header.forEach((col, index) => {
      doc.text(String(col), 14 + index * colWidth, startY);
    });

    rows.forEach((row, rowIndex) => {
      header.forEach((col, colIndex) => {
        const value = String(row[col] ?? "");
        doc.text(
          value.substring(0, 20),
          14 + colIndex * colWidth,
          startY + (rowIndex + 1) * rowHeight
        );
      });
    });

    doc.save(`orders-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exported");
  };

  const handleAddOrder = () => {
    setIsAddModalOpen(true);
  };

  const handleView = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const handleDownloadInvoice = async (order) => {
    const orderId = order?._id;
    if (!orderId) {
      toast.error("Order details unavailable");
      return;
    }

    const paymentStatus = (order.payment?.status || "pending").toLowerCase();
    if (paymentStatus !== "paid") {
      toast.error("Invoice will be available once the payment is successful.");
      return;
    }

    try {
      setDownloadingInvoiceId(orderId);
      const response = await api.get(`/orders/${orderId}/invoice`, {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      });

      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || `invoice-${orderId}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (errorDownload) {
      console.error("Invoice download failed", errorDownload);
      const message =
        errorDownload?.response?.data?.message ||
        errorDownload?.message ||
        "Unable to download invoice. Please try again.";
      toast.error(message);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleDelete = async (orderId) => {
    if (!orderId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this order?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(orderId);
      await deleteAdminOrder(orderId);
      toast.success("Order deleted");
      const params = latestParamsRef.current;
      if (params) {
        dispatch(fetchAdminOrdersThunk(params));
      }
    } catch (error) {
      console.error("Failed to delete order", error);
      toast.error(error?.message || "Failed to delete order");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selection.selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selection.selectedIds.length} selected order${
        selection.selectedIds.length > 1 ? "s" : ""
      }?`
    );
    if (!confirmed) return;

    try {
      await deleteAdminOrdersBulk(selection.selectedIds);
      toast.success("Selected orders deleted");
      dispatch(clearSelection());
      const params = latestParamsRef.current;
      if (params) {
        dispatch(fetchAdminOrdersThunk(params));
      }
    } catch (error) {
      console.error("Failed to delete selected orders", error);
      toast.error(error?.message || "Failed to delete selected orders");
    }
  };

  const handleOpenEdit = useCallback((order) => {
    if (!order) return;
    const nextForm = {
      status: order.status || "processing",
      paymentStatus: order.payment?.status || "",
      paymentMethod: order.payment?.method || "",
      estimatedDeliveryDate: order.estimatedDeliveryDate
        ? new Date(order.estimatedDeliveryDate).toISOString().slice(0, 10)
        : "",
    };
    setEditingOrder(order);
    setEditForm(nextForm);
  }, []);

  const handleCloseEdit = useCallback(() => {
    if (isSavingEdit) return;
    setEditingOrder(null);
  }, [isSavingEdit]);

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setIsSavingEdit(true);
    try {
      const payload = {
        status: editForm.status || undefined,
        paymentStatus: editForm.paymentStatus || undefined,
        paymentMethod: editForm.paymentMethod || undefined,
        estimatedDeliveryDate: editForm.estimatedDeliveryDate || null,
      };

      await updateOrderRequest(editingOrder._id, payload);

      toast.success("Order updated successfully");
      const params = latestParamsRef.current;
      if (params) {
        dispatch(fetchAdminOrdersThunk(params));
      }
      setEditingOrder(null);
    } catch (error) {
      console.error("Failed to update order", error);
      toast.error(
        error?.message ||
          error?.response?.data?.message ||
          "Failed to update order"
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderStatus = (status) => {
    const key = String(status || "").toLowerCase();
    const config = STATUS_LABELS[key];
    if (!config) {
      return <span className="text-slate-400">--</span>;
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const navbarNotifications = useMemo(
    () => ({
      pendingOrders: summary?.processing ?? 0,
      shippedOrders: summary?.shipped ?? 0,
      deliveredOrders: summary?.delivered ?? 0,
    }),
    [summary]
  );

  const handleSelectionDetails = () => {
    setIsSelectionDetailsOpen(true);
  };

  const handleSelectionDetailsClose = () => {
    setIsSelectionDetailsOpen(false);
  };

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden md:overflow-hidden">
      <div className="flex md:h-screen">
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
            <div className="relative z-10 h-full w-72 max-w-[85%] origin-left animate-slide-in bg-white shadow-2xl">
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

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            activeRange="All Date"
            onSelectRange={() => {}}
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            showRangeSelector={false}
            showNotifications={false}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Dashboard / Orders</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Orders
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 sm:w-auto"
                >
                  <Download size={16} />
                  Export
                  <AnimatePresence>
                    {isExportMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white text-left shadow-xl"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            handleExportCsv();
                            setIsExportMenuOpen(false);
                          }}
                          className="block w-full px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Export as CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleExportXlsx();
                            setIsExportMenuOpen(false);
                          }}
                          className="block w-full px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Export as XLSX
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleExportPdf();
                            setIsExportMenuOpen(false);
                          }}
                          className="block w-full px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Export as PDF
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                <button
                  type="button"
                  onClick={handleAddOrder}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
                >
                  <Plus size={16} />
                  Add Order
                </button>
                {selection.selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectionDetails}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 sm:w-auto"
                  >
                    View selected ({selection.selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map(
                ({ key, label, value, icon: Icon, iconClasses }) => (
                  <article
                    key={key}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    {Icon ? (
                      <div
                        className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                          iconClasses || "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Icon size={22} strokeWidth={2} />
                      </div>
                    ) : null}
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p className="mt-6 text-3xl font-semibold text-slate-900">
                      {value.toLocaleString()}
                    </p>
                  </article>
                )
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                <form
                  onSubmit={handleSearch}
                  className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Search by order ID, product, or customer"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 transition focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Search
                  </button>
                </form>

                <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center">
                  <label className="flex w-full items-center gap-2 text-sm text-slate-600 sm:w-auto">
                    <Filter size={16} className="text-slate-400" />
                    <select
                      value={statusValue}
                      onChange={handleStatusChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none sm:w-auto"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <DatePicker
                        selected={startDateValue}
                        onChange={handleStartDateChange}
                        selectsStart
                        startDate={startDateValue}
                        endDate={endDateValue}
                        maxDate={endDateValue || undefined}
                        placeholderText="Start date"
                        isClearable
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none sm:w-36"
                      />
                    </div>
                    <span className="hidden text-slate-400 sm:inline">-</span>
                    <DatePicker
                      selected={endDateValue}
                      onChange={handleEndDateChange}
                      selectsEnd
                      startDate={startDateValue}
                      endDate={endDateValue}
                      minDate={startDateValue || undefined}
                      placeholderText="End date"
                      isClearable
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none sm:w-36"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={minAmountValue}
                      onChange={(event) =>
                        handleAmountChange("min", event.target.value)
                      }
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="Min amount"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none sm:w-28"
                    />
                    <span className="hidden text-slate-400 sm:inline">-</span>
                    <input
                      type="text"
                      value={maxAmountValue}
                      onChange={(event) =>
                        handleAmountChange("max", event.target.value)
                      }
                      inputMode="decimal"
                      pattern="[0-9]*"
                      placeholder="Max amount"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none sm:w-28"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 sm:w-auto"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4">
                {selection.selectedIds.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {selection.selectedIds.length} order
                        {selection.selectedIds.length > 1 ? "s" : ""} selected
                      </p>
                      <p className="text-xs text-blue-600/80">
                        Download, inspect, or delete the selected orders.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectionDetails}
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-white"
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-white"
                      >
                        Delete selected
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">
                    Showing{" "}
                    <span className="font-semibold text-slate-700">
                      {startIndex}
                    </span>
                    -
                    <span className="font-semibold text-slate-700">
                      {endIndex}
                    </span>{" "}
                    of
                    <span className="font-semibold text-slate-700">
                      {" "}
                      {total}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    Sort by
                    <select
                      value={`${sort.field}:${sort.order}`}
                      onChange={handleSortChange}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    >
                      <option value="createdAt:desc">Newest first</option>
                      <option value="createdAt:asc">Oldest first</option>
                      <option value="customerName:asc">Customer A-Z</option>
                      <option value="customerName:desc">Customer Z-A</option>
                    </select>
                  </label>
                </div>

                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-medium uppercase text-slate-500">
                          <th className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selection.allSelected}
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              aria-label="Select all orders"
                            />
                          </th>
                          <th className="px-4 py-3">Order ID</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-600">
                        {loading && (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-8 text-center text-slate-400"
                            >
                              Loading orders...
                            </td>
                          </tr>
                        )}
                        {error && !loading && (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-8 text-center text-rose-500"
                            >
                              {error}
                            </td>
                          </tr>
                        )}
                        {!loading && !error && items.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-8 text-center text-slate-400"
                            >
                              No orders found for the selected filters.
                            </td>
                          </tr>
                        )}
                        {!loading &&
                          !error &&
                          items.map((order) => {
                            const orderId = order._id;
                            const firstItem = order.items?.[0];
                            const productImage =
                              firstItem?.thumbnail ||
                              firstItem?.image ||
                              order.productImage ||
                              order.items?.find(
                                (item) => item.image || item.thumbnail
                              )?.image ||
                              order.items?.find(
                                (item) => item.image || item.thumbnail
                              )?.thumbnail ||
                              null;
                            const remaining = Math.max(
                              (order.items?.length || 0) - 1,
                              0
                            );
                            const customerName =
                              order.customerName ||
                              order.shippingAddress?.fullName ||
                              "Customer";
                            const totalAmount =
                              order.totalAmount ??
                              order.pricing?.total ??
                              order.grandTotal ??
                              0;
                            const isSelected =
                              selection.selectedIds.includes(orderId);
                            const paymentStatus = (
                              order.payment?.status || "pending"
                            ).toLowerCase();
                            const isPaymentPaid = paymentStatus === "paid";

                            return (
                              <tr
                                key={orderId}
                                className={
                                  isSelected ? "bg-slate-50" : undefined
                                }
                              >
                                <td className="px-4 py-3 align-middle">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleRowToggle(orderId)}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    aria-label={`Select order ${orderId}`}
                                  />
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  #{orderId}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100">
                                      {productImage ? (
                                        <img
                                          src={productImage}
                                          alt={firstItem?.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="grid h-full w-full place-items-center text-xs text-slate-400">
                                          Img
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                      <p className="font-medium text-slate-800">
                                        {firstItem?.name || "Product"}
                                      </p>
                                      {remaining > 0 && (
                                        <p className="text-xs text-slate-400">
                                          + {remaining} other products
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {formatDate(order.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm">
                                    <p className="font-medium text-slate-700">
                                      {customerName}
                                    </p>
                                    {order.customerEmail && (
                                      <p className="text-xs text-slate-500 break-all">
                                        {order.customerEmail}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {formatCurrency(totalAmount)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col items-start gap-1">
                                    {renderStatus?.(order.status)}
                                    <span
                                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                                        isPaymentPaid
                                          ? "bg-emerald-100 text-emerald-600"
                                          : "bg-amber-100 text-amber-600"
                                      }`}
                                    >
                                      Payment:{" "}
                                      {isPaymentPaid ? "Paid" : paymentStatus}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-3 text-sm">
                                    <button
                                      type="button"
                                      onClick={() => handleView(orderId)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                                      aria-label={`View order ${orderId}`}
                                    >
                                      <span className="sr-only">
                                        View order {orderId}
                                      </span>
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadInvoice(order)
                                      }
                                      disabled={
                                        !isPaymentPaid ||
                                        downloadingInvoiceId === orderId
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover-border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      aria-label={`Download invoice for order ${orderId}`}
                                      title={
                                        isPaymentPaid
                                          ? "Download invoice"
                                          : "Invoice available after payment"
                                      }
                                    >
                                      {downloadingInvoiceId === orderId ? (
                                        <Loader2
                                          size={16}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Download size={16} />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(orderId)}
                                      disabled={deletingId === orderId}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      aria-label={`Delete order ${orderId}`}
                                    >
                                      <span className="sr-only">
                                        Delete order {orderId}
                                      </span>
                                      {deletingId === orderId ? (
                                        <Loader2
                                          size={16}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Trash2 size={16} />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(order)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-purple-100 text-purple-600 transition hover:border-purple-200 hover:bg-purple-50"
                                      aria-label={`Edit order ${orderId}`}
                                    >
                                      <PencilLine size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:hidden">
                  {loading && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-400">
                      Loading orders...
                    </div>
                  )}
                  {error && !loading && (
                    <div className="rounded-2xl border border-rose-200 bg-white p-4 text-center text-rose-500">
                      {error}
                    </div>
                  )}
                  {!loading && !error && items.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-400">
                      No orders found for the selected filters.
                    </div>
                  )}
                  {!loading &&
                    !error &&
                    items.map((order) => {
                      const orderId = order._id;
                      const firstItem = order.items?.[0];
                      const productImage =
                        firstItem?.thumbnail ||
                        firstItem?.image ||
                        order.productImage ||
                        order.items?.find(
                          (item) => item.image || item.thumbnail
                        )?.image ||
                        order.items?.find(
                          (item) => item.image || item.thumbnail
                        )?.thumbnail ||
                        null;
                      const remaining = Math.max(
                        (order.items?.length || 0) - 1,
                        0
                      );
                      const customerName =
                        order.customerName ||
                        order.shippingAddress?.fullName ||
                        "Customer";
                      const totalAmount =
                        order.totalAmount ??
                        order.pricing?.total ??
                        order.grandTotal ??
                        0;
                      const isSelected =
                        selection.selectedIds.includes(orderId);
                      const paymentStatus = (
                        order.payment?.status || "pending"
                      ).toLowerCase();
                      const isPaymentPaid = paymentStatus === "paid";

                      return (
                        <article
                          key={orderId}
                          className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                            isSelected ? "ring-1 ring-blue-200" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                Order
                              </p>
                              <p className="text-lg font-semibold text-slate-900 break-all">
                                #{orderId}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRowToggle(orderId)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                                isSelected
                                  ? "border-blue-200 bg-blue-50 text-blue-600"
                                  : "border-slate-200 text-slate-500"
                              }`}
                              aria-label={`Select order ${orderId}`}
                            >
                              ✓
                            </button>
                          </div>

                          <div className="mt-4 flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                              {productImage ? (
                                <img
                                  src={productImage}
                                  alt={firstItem?.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-xs text-slate-400">
                                  Img
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-sm text-slate-600">
                              <p className="font-medium text-slate-900">
                                {firstItem?.name || "Product"}
                              </p>
                              {remaining > 0 && (
                                <p className="text-xs text-slate-400">
                                  + {remaining} other products
                                </p>
                              )}
                            </div>
                          </div>

                          <dl className="mt-4 space-y-2 text-sm text-slate-600">
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Placed</dt>
                              <dd className="font-medium text-slate-700">
                                {formatDate(order.createdAt)}
                              </dd>
                            </div>
                            <div className="space-y-1">
                              <dt className="text-slate-400">Customer</dt>
                              <dd className="font-medium text-slate-800">
                                {customerName}
                              </dd>
                              {order.customerEmail && (
                                <dd className="text-xs text-slate-500 break-all">
                                  {order.customerEmail}
                                </dd>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Amount</dt>
                              <dd className="font-semibold text-slate-900">
                                {formatCurrency(totalAmount)}
                              </dd>
                            </div>
                            <div className="space-y-1">
                              <dt className="text-slate-400">Status</dt>
                              <dd>{renderStatus(order.status)}</dd>
                              <dd>
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                                    isPaymentPaid
                                      ? "bg-emerald-100 text-emerald-600"
                                      : "bg-amber-100 text-amber-600"
                                  }`}
                                >
                                  Payment:{" "}
                                  {isPaymentPaid ? "Paid" : paymentStatus}
                                </span>
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleView(orderId)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-100 text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                              aria-label={`View order ${orderId}`}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(order)}
                              disabled={
                                !isPaymentPaid ||
                                downloadingInvoiceId === orderId
                              }
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Download invoice for order ${orderId}`}
                              title={
                                isPaymentPaid
                                  ? "Download invoice"
                                  : "Invoice available after payment"
                              }
                            >
                              {downloadingInvoiceId === orderId ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(orderId)}
                              disabled={deletingId === orderId}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-100 text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Delete order ${orderId}`}
                            >
                              {deletingId === orderId ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(order)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-100 text-purple-600 transition hover:border-purple-200 hover:bg-purple-50"
                              aria-label={`Edit order ${orderId}`}
                            >
                              <PencilLine size={16} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    Rows per page
                    <select
                      value={limit}
                      onChange={handleLimitChange}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    >
                      {[10, 20, 50].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      className="rounded-lg border border-slate-200 px-3 py-1 hover:border-blue-200 hover:text-blue-600"
                    >
                      Prev
                    </button>
                    <span>
                      Page <span className="font-semibold">{page}</span> of
                      <span className="font-semibold"> {totalPages}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      className="rounded-lg border border-slate-200 px-3 py-1 hover:border-blue-200 hover:text-blue-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
      <AddOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (payload) => {
          console.info("Order draft submitted", payload);
        }}
      />
      <SelectionDetailsModal
        isOpen={isSelectionDetailsOpen}
        onClose={handleSelectionDetailsClose}
        orders={items.filter((order) =>
          selection.selectedIds.includes(order._id)
        )}
        renderStatus={renderStatus}
      />
      <AnimatePresence>
        {editingOrder && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Edit Order
                  </h2>
                  <p className="text-xs text-slate-500">
                    Order #{editingOrder._id}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={handleCloseEdit}
                  aria-label="Close edit order"
                  disabled={isSavingEdit}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Order Status
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      handleEditFieldChange("status", event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="confirmed">Order Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="shipped">Shipped</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
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
                      <option value="pending">Pending</option>
                      <option value="paid">Successful</option>
                      <option value="failed">Failed</option>
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
                      <option value="cod">Cash on Delivery</option>
                      <option value="upi">UPI</option>
                      <option value="qr">QR Code</option>
                      <option value="card">Card</option>
                      <option value="netbanking">Net Banking</option>
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

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={handleCloseEdit}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrdersPage;
