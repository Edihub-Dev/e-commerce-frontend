import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { utils as XLSXUtils, writeFile as writeXlsxFile } from "xlsx";
import jsPDF from "jspdf";
import {
  downloadOrderInvoice,
  fetchSellerOrders,
  fetchOrderById,
  updateOrder,
  deleteSellerOrder,
  deleteSellerOrdersBulk,
} from "../utils/api";
import {
  Search,
  Filter,
  Package,
  Loader2,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Truck,
  Eye,
  Download,
  Trash2,
  PencilLine,
  X,
  CheckCircle2,
  Circle,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All payments" },
  { value: "pending", label: "Payment pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];

const SORT_OPTIONS = [
  { value: "desc", label: "Newest first" },
  { value: "asc", label: "Oldest first" },
];

const SUMMARY_CONFIG = [
  { key: "processing", label: "Processing Orders" },
  { key: "shipped", label: "Shipped Orders" },
  { key: "paid", label: "Paid Orders" },
  { key: "delivered", label: "Delivered Orders" },
  { key: "returned", label: "Return/Replace" },
];

const statusBadgeClasses = {
  processing: "bg-amber-50 text-amber-600 border border-amber-200",
  shipped: "bg-sky-50 text-sky-600 border border-sky-200",
  delivered: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  returned: "bg-rose-50 text-rose-600 border border-rose-200",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  const adjusted = new Date(parsed.getTime() - tzOffsetMs);
  return adjusted.toISOString().slice(0, 10);
};

const SellerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    statusCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [downloadingOrderId, setDownloadingOrderId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    estimatedDeliveryDate: "",
  });
  const todayInputValue = useMemo(() => toDateInputValue(new Date()), []);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const lastNonDeliveredEstimateRef = useRef("");
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewingOrderLoading, setViewingOrderLoading] = useState(false);
  const [viewingOrderError, setViewingOrderError] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchSellerOrders({
          page,
          limit: pageSize,
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          search: searchFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          sortOrder: sortOrder || undefined,
        });
        if (!isMounted) return;
        setOrders(response?.data || []);
        setMeta(response?.meta || meta);
        setSelectedOrderIds([]);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load orders");
        setOrders([]);
        setMeta((prev) => ({
          ...prev,
          total: 0,
          totalPages: 1,
          limit: pageSize,
        }));
        setSelectedOrderIds([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      isMounted = false;
    };
  }, [
    page,
    status,
    paymentStatus,
    searchFilter,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortOrder,
    pageSize,
    refreshToken,
  ]);

  const summaryCards = useMemo(() => {
    const counts = meta.statusCounts || {};
    let paidCount = 0;

    orders.forEach((order) => {
      if (String(order.paymentStatus || "").toLowerCase() === "paid") {
        paidCount += 1;
      }
    });

    return SUMMARY_CONFIG.map(({ key, label }) => {
      const value =
        key === "paid" ? paidCount : counts[key] != null ? counts[key] : 0;
      return { key, label, value };
    });
  }, [meta.statusCounts, orders]);

  const buildExportRows = useCallback(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const formatShippingAddress = (address = {}) => {
      const contactLine = [address.fullName, address.mobile]
        .filter(Boolean)
        .join(" • ");

      const emailLine = address.email ? `Email: ${address.email}` : "";
      const streetLine = [address.addressLine, address.landmark]
        .filter(Boolean)
        .join(", ");
      const cityLine = [address.city, address.district]
        .filter(Boolean)
        .join(", ");
      const stateLine = [address.state, address.pincode]
        .filter(Boolean)
        .join(" - ");

      return [contactLine, emailLine, streetLine, cityLine, stateLine]
        .filter(Boolean)
        .join("\n");
    };

    return orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const primaryItem = items[0] || {};
      const address = order.shippingAddress || {};
      const qrfolio = order.qrfolio || {};
      const resolveQrfolioFallback = () => {
        if (qrfolio.imageKey) {
          return qrfolio.imageKey;
        }

        const source = qrfolio.imageUrl || "";
        if (!source) {
          return "";
        }

        try {
          const url = new URL(source, window.location.origin);
          const pathname = url.pathname || "";
          const trimmed = pathname.endsWith("/")
            ? pathname.slice(0, -1)
            : pathname;
          const segments = trimmed.split("/").filter(Boolean);
          return segments.length ? segments[segments.length - 1] : "";
        } catch (error) {
          const sanitized = source.split("?")[0];
          const fallbackSegments = sanitized.split("/").filter(Boolean);
          return fallbackSegments.length
            ? fallbackSegments[fallbackSegments.length - 1]
            : sanitized;
        }
      };
      const qrfolioUrl =
        typeof qrfolio.imageUrl === "string" ? qrfolio.imageUrl.trim() : "";
      const row = {};

      row["Order ID"] = order.orderId || order.id || order._id;
      row.Status = order.orderStatus || order.status || "processing";
      row["Payment Status"] =
        order.paymentStatus || order.payment?.status || "pending";
      row["Payment Method"] =
        order.paymentMethod || order.payment?.method || "";
      row["Total Amount"] =
        order.total ?? order.totalAmount ?? order.pricing?.total ?? 0;
      row["Item Count"] = items.length;
      row["Primary Item"] = primaryItem.name || primaryItem.productName || "";
      row["Primary SKU"] = primaryItem.sku || "";
      row["Buyer Name"] =
        order.buyerName || order.customerName || address.fullName || "";
      row["Buyer Email"] =
        order.buyerEmail || order.customerEmail || address.email || "";
      row["Buyer Phone"] = order.buyerPhone || address.mobile || "";
      row["Created At"] = formatDate(order.createdAt);
      row["Estimated Delivery"] = order.estimatedDeliveryDate
        ? formatDate(order.estimatedDeliveryDate)
        : "--";
      row["Shipping Address"] = formatShippingAddress(address);
      row["QR Folio Image"] = qrfolioUrl || resolveQrfolioFallback();

      Object.defineProperty(row, "__qrfolioLink", {
        value: qrfolioUrl,
        enumerable: false,
      });

      return row;
    });
  }, [orders]);

  const handleExportCsv = useCallback(() => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const header = Object.keys(rows[0]);
    const csvContent = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `seller-orders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [buildExportRows]);

  const handleExportXlsx = useCallback(() => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const worksheet = XLSXUtils.json_to_sheet(rows);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, "Orders");

    const header = Object.keys(rows[0]);
    const qrColumnIndex = header.indexOf("QR Folio Image");

    if (qrColumnIndex !== -1) {
      rows.forEach((row, rowIndex) => {
        const qrLink = row.__qrfolioLink;
        if (!qrLink) {
          return;
        }

        const cellAddress = XLSXUtils.encode_cell({
          r: rowIndex + 1,
          c: qrColumnIndex,
        });
        const cell = worksheet[cellAddress];
        if (!cell) {
          return;
        }

        cell.t = "s";
        if (qrLink === row["QR Folio Image"]) {
          cell.v = qrLink;
        } else {
          cell.v = row["QR Folio Image"] || "View QR Image";
        }
        cell.l = {
          Target: qrLink,
          Tooltip: "Open QR folio image",
        };
      });
    }

    writeXlsxFile(
      workbook,
      `seller-orders-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("XLSX exported");
  }, [buildExportRows]);

  const handleExportPdf = useCallback(() => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Seller Orders", doc.internal.pageSize.getWidth() / 2, 24, {
      align: "center",
    });

    const headers = [
      "Order ID",
      "Status",
      "Payment",
      "Total",
      "Primary Item",
      "Buyer",
      "Item Count",
      "Shipping Address",
    ];

    const columnWidths = [42, 40, 68, 32, 90, 90, 32, 180];
    const startX = 20;
    let currentY = 36;

    const drawRow = (values, { header = false } = {}) => {
      const rowHeight = header ? 12 : 13;
      let cursorX = startX;

      values.forEach((value, index) => {
        const cellWidth = columnWidths[index];
        const text = Array.isArray(value)
          ? value
          : doc.splitTextToSize(String(value ?? ""), cellWidth - 6);

        if (header) {
          doc.setFillColor(15, 23, 42);
          doc.setTextColor(255, 255, 255);
          doc.rect(cursorX, currentY, cellWidth, rowHeight, "F");
          doc.setFont("Helvetica", "bold");
          doc.text(String(value), cursorX + 4, currentY + 8);
        } else {
          doc.setFillColor(248, 250, 252);
          doc.rect(cursorX, currentY, cellWidth, rowHeight, "S");
          doc.setTextColor(30, 41, 59);
          doc.setFont("Helvetica", "normal");
          doc.text(text, cursorX + 4, currentY + rowHeight / 2, {
            baseline: "middle",
          });
        }

        cursorX += cellWidth;
      });

      currentY += rowHeight;
    };

    drawRow(headers, { header: true });

    rows.forEach((row) => {
      const paymentLabel = `${row["Payment Status"] || ""}${
        row["Payment Method"] ? ` (${row["Payment Method"]})` : ""
      }`;
      const buyerLabel = [
        row["Buyer Name"],
        row["Buyer Email"],
        row["Buyer Phone"],
      ]
        .filter(Boolean)
        .join(" • ");

      const values = [
        row["Order ID"],
        row.Status,
        paymentLabel,
        row["Total Amount"],
        `${row["Primary Item"]}${
          row["Primary SKU"] ? ` (SKU: ${row["Primary SKU"]})` : ""
        }`,
        buyerLabel,
        row["Item Count"],
        row["Shipping Address"],
      ];

      if (currentY + 15 > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage({ orientation: "landscape" });
        currentY = 36;
        drawRow(headers, { header: true });
      }

      drawRow(values);
    });

    doc.save(`seller-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exported");
  }, [buildExportRows]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchFilter(searchValue.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setSearchFilter("");
    setStatus("");
    setPaymentStatus("");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
    setSortOrder("desc");
    setPage(1);
  };

  const handleAmountChange = (type, value) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    if (type === "min") {
      setMinAmount(sanitized);
    } else {
      setMaxAmount(sanitized);
    }
  };

  const effectiveLimit = meta.limit || pageSize;
  const startIndex =
    meta.total > 0 ? (page - 1) * effectiveLimit + (orders.length ? 1 : 0) : 0;
  const endIndex =
    meta.total > 0 ? (page - 1) * effectiveLimit + orders.length : 0;

  const allSelected =
    orders.length > 0 && selectedOrderIds.length === orders.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedOrderIds([]);
    } else {
      // Track the real Order IDs for bulk actions so that the backend
      // /orders/bulk-delete endpoint receives the proper identifiers.
      const nextIds = orders
        .map((order) => (order.orderId ? String(order.orderId) : null))
        .filter(Boolean);
      setSelectedOrderIds(nextIds);
    }
  };

  const handleToggleRowSelection = (orderId) => {
    const key = orderId ? String(orderId) : "";
    if (!key) return;
    setSelectedOrderIds((prev) =>
      prev.includes(key)
        ? prev.filter((itemId) => itemId !== key)
        : [...prev, key]
    );
  };

  const handleViewOrder = (order) => {
    if (!order?.orderId) {
      toast.error("Order reference unavailable");
      return;
    }

    navigate(`/seller/orders/${order.orderId}`);
  };

  const handleDownloadInvoiceClick = async (order) => {
    if (!order?.orderId) {
      toast.error("Order reference unavailable");
      return;
    }

    const paymentStatusValue = String(
      order.paymentStatus || "pending"
    ).toLowerCase();
    if (paymentStatusValue !== "paid") {
      toast.error("Invoice will be available once the payment is successful.");
      return;
    }

    try {
      setDownloadingOrderId(order.orderId);
      const response = await downloadOrderInvoice(order.orderId);
      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || `invoice-${order.orderId}.pdf`;

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
      const message =
        errorDownload?.response?.data?.message ||
        errorDownload?.message ||
        "Unable to download invoice. Please try again.";
      toast.error(message);
    } finally {
      setDownloadingOrderId(null);
    }
  };

  const handleDeleteOrderClick = (order) => {
    if (!order?.orderId) {
      toast.error("Order reference unavailable");
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to delete this order?"
    );
    if (!confirmed) return;

    const run = async () => {
      try {
        setDeletingOrderId(order.orderId);
        const payload = await deleteSellerOrder(order.orderId);
        const message = payload?.message || "Order deleted";
        toast.success(message);
        setRefreshToken((prev) => prev + 1);
      } catch (errorDelete) {
        const message =
          errorDelete?.response?.data?.message ||
          errorDelete?.message ||
          "Failed to delete order";
        toast.error(message);
      } finally {
        setDeletingOrderId(null);
      }
    };

    run();
  };

  const handleBulkDeleteSelected = async () => {
    if (!selectedOrderIds.length) {
      toast.error("Select at least one order to delete");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedOrderIds.length} selected order${
        selectedOrderIds.length > 1 ? "s" : ""
      }? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const payload = await deleteSellerOrdersBulk(selectedOrderIds);

      const message =
        payload?.message ||
        `${selectedOrderIds.length} order${
          selectedOrderIds.length > 1 ? "s" : ""
        } deleted`;
      toast.success(message);
      setRefreshToken((prev) => prev + 1);
    } catch (errorBulk) {
      const message =
        errorBulk?.response?.data?.message ||
        errorBulk?.message ||
        "Failed to delete selected orders";
      toast.error(message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleEditOrderClick = async (order) => {
    if (!order?.orderId) {
      toast.error("Order reference unavailable");
      return;
    }

    try {
      const response = await fetchOrderById(order.orderId);
      const fullOrder = response?.data;
      if (!fullOrder) {
        throw new Error("Order details not found");
      }

      const nextForm = {
        status: fullOrder.status || "processing",
        paymentStatus: fullOrder.payment?.status || "",
        paymentMethod: fullOrder.payment?.method || "",
        estimatedDeliveryDate:
          toDateInputValue(fullOrder.estimatedDeliveryDate) || "",
      };

      setEditingOrder(fullOrder);
      setEditForm(nextForm);

      const initialEstimate =
        String(nextForm.status || "").toLowerCase() === "delivered"
          ? ""
          : nextForm.estimatedDeliveryDate;
      lastNonDeliveredEstimateRef.current = initialEstimate;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load order for editing";
      toast.error(message);
    }
  };

  const handleCloseEdit = () => {
    if (isSavingEdit) return;
    setEditingOrder(null);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusFieldChange = (event) => {
    const nextStatus = event.target.value;
    setEditForm((prev) => {
      const prevStatus = String(prev.status || "").toLowerCase();
      const nextStatusLower = String(nextStatus || "").toLowerCase();
      const willBeDelivered = nextStatusLower === "delivered";
      const wasDelivered = prevStatus === "delivered";

      let nextEstimated = prev.estimatedDeliveryDate;

      if (willBeDelivered && !wasDelivered) {
        if (
          !prev.estimatedDeliveryDate &&
          lastNonDeliveredEstimateRef.current
        ) {
          // keep stored fallback when returning from delivered later
        } else {
          lastNonDeliveredEstimateRef.current =
            prev.estimatedDeliveryDate ||
            lastNonDeliveredEstimateRef.current ||
            "";
        }
        nextEstimated = todayInputValue;
      } else if (!willBeDelivered && wasDelivered) {
        nextEstimated = lastNonDeliveredEstimateRef.current || "";
      }

      if (!willBeDelivered) {
        lastNonDeliveredEstimateRef.current =
          nextEstimated || lastNonDeliveredEstimateRef.current || "";
      }

      return {
        ...prev,
        status: nextStatus,
        estimatedDeliveryDate: nextEstimated,
      };
    });
  };

  const normalizedOrderPaymentStatus = (editingOrder?.payment?.status || "")
    .toString()
    .toLowerCase();
  const normalizedFormPaymentStatus = (editForm.paymentStatus || "")
    .toString()
    .toLowerCase();
  const effectivePaymentStatus =
    normalizedFormPaymentStatus || normalizedOrderPaymentStatus;
  const normalizedFormStatus = (editForm.status || "").toString().toLowerCase();

  const isDeliveryDateLocked = editingOrder
    ? ["delivered", "returned"].includes(
        (editingOrder.status || "").toString().toLowerCase()
      )
    : false;

  const isPaymentStatusLocked =
    normalizedOrderPaymentStatus === "paid" ||
    normalizedFormPaymentStatus === "paid";

  const isPaymentSuccessful = [
    "paid",
    "success",
    "successful",
    "completed",
  ].includes(effectivePaymentStatus);
  const requiresPaymentSuccess = normalizedFormStatus === "delivered";
  const canSaveEdit = !requiresPaymentSuccess || isPaymentSuccessful;

  const handleEstimatedDeliveryChange = (event) => {
    const { value } = event.target;
    if (isDeliveryDateLocked) {
      toast.error("Estimated delivery date cannot be changed after delivery.");
      return;
    }
    setEditForm((prev) => {
      const isDelivered =
        String(prev.status || "").toLowerCase() === "delivered";
      if (!isDelivered) {
        lastNonDeliveredEstimateRef.current = value;
      }
      return { ...prev, estimatedDeliveryDate: value };
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;

    if (requiresPaymentSuccess && !isPaymentSuccessful) {
      toast.error(
        "Payment must be successful before marking an order as delivered."
      );
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        status: editForm.status || undefined,
        paymentStatus: editForm.paymentStatus || undefined,
        paymentMethod: editForm.paymentMethod || undefined,
        estimatedDeliveryDate: editForm.estimatedDeliveryDate || null,
      };

      await updateOrder(editingOrder._id, payload);

      toast.success("Order updated successfully");
      setRefreshToken((prev) => prev + 1);
      setEditingOrder(null);
    } catch (errorUpdate) {
      const message =
        errorUpdate?.message ||
        errorUpdate?.response?.data?.message ||
        "Failed to update order";
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCloseView = () => {
    if (viewingOrderLoading) return;
    setViewingOrder(null);
    setViewingOrderError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            Dashboard / Orders
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Orders</h1>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by order ID, product, or customer"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="grid gap-3 text-xs text-slate-600 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-500">Payment</span>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-500">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-500">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-500">Amount min</span>
              <input
                type="text"
                inputMode="decimal"
                value={minAmount}
                onChange={(event) =>
                  handleAmountChange("min", event.target.value)
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                placeholder="Min"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-500">Amount max</span>
              <input
                type="text"
                inputMode="decimal"
                value={maxAmount}
                onChange={(event) =>
                  handleAmountChange("max", event.target.value)
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                placeholder="Max"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-500">Sort</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
          <div>
            {meta.total > 0 ? (
              <>
                Showing
                <span className="font-semibold text-slate-700">
                  {startIndex}
                </span>
                -
                <span className="font-semibold text-slate-700">{endIndex}</span>{" "}
                of
                <span className="font-semibold text-slate-700">
                  {" "}
                  {meta.total}
                </span>
              </>
            ) : (
              "Showing 0 of 0"
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              >
                <Download size={14} /> Export
              </button>
              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white text-left shadow-xl origin-top-right"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCsv();
                        setIsExportMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportXlsx();
                        setIsExportMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Export as XLSX
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportPdf();
                        setIsExportMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Export as PDF
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={handleBulkDeleteSelected}
              disabled={!selectedOrderIds.length || isBulkDeleting || loading}
              className="inline-flex items-center gap-2 rounded-full border border-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={14} />
              <span>
                Delete selected
                {selectedOrderIds.length ? ` (${selectedOrderIds.length})` : ""}
              </span>
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium uppercase text-slate-500">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
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
              {!loading && !error && orders.length === 0 && (
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
                orders.map((order) => {
                  const id = String(order.id);
                  const orderKey = order.orderId ? String(order.orderId) : id;
                  const firstItem = order.items?.[0] || {};
                  const productImage = firstItem.image || null;
                  const remaining = Math.max((order.items?.length || 0) - 1, 0);
                  const customerName = order.buyerName || "Customer";
                  const customerEmail = order.buyerEmail || "";
                  const isSelected = selectedOrderIds.includes(orderKey);
                  const paymentStatusValue = String(
                    order.paymentStatus || "pending"
                  ).toLowerCase();
                  const isPaymentPaid = paymentStatusValue === "paid";
                  const statusKey = String(order.status || "").toLowerCase();
                  const statusClass =
                    statusBadgeClasses[statusKey] ||
                    "bg-slate-50 text-slate-600 border border-slate-200";

                  return (
                    <tr
                      key={id}
                      className={isSelected ? "bg-slate-50" : undefined}
                    >
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            handleToggleRowSelection(order.orderId)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select order ${order.orderId}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        #{order.orderId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={
                                  firstItem.productName ||
                                  firstItem.itemName ||
                                  "Product"
                                }
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
                              {firstItem.productName ||
                                firstItem.itemName ||
                                "Product"}
                            </p>
                            {remaining > 0 && (
                              <p className="text-xs text-slate-400">
                                + {remaining} other items
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
                          {customerEmail ? (
                            <p className="break-all text-xs text-slate-500">
                              {customerEmail}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                          >
                            {order.status}
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                              isPaymentPaid
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-amber-100 text-amber-600"
                            }`}
                          >
                            Payment: {paymentStatusValue}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => handleViewOrder(order)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                            aria-label={`View order ${order.orderId}`}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadInvoiceClick(order)}
                            disabled={
                              downloadingOrderId === order.orderId || loading
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                            aria-label={`Download invoice for order ${order.orderId}`}
                          >
                            {downloadingOrderId === order.orderId ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrderClick(order)}
                            disabled={
                              deletingOrderId === order.orderId || loading
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
                            aria-label={`Delete order ${order.orderId}`}
                          >
                            {deletingOrderId === order.orderId ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditOrderClick(order)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-purple-100 text-purple-600 transition hover:border-purple-200 hover:bg-purple-50"
                            aria-label={`Edit order ${order.orderId}`}
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

        <div className="space-y-3 border-t border-slate-100 px-4 py-4 md:hidden">
          {loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center text-slate-500">
              <div className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-rose-200 bg-white p-5 text-center text-rose-600">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center text-slate-500">
              No orders found for the selected filters.
            </div>
          )}

          {!loading &&
            !error &&
            orders.map((order) => {
              const id = String(order.id);
              const orderKey = order.orderId ? String(order.orderId) : id;
              const firstItem = order.items?.[0] || {};
              const productImage = firstItem.image || null;
              const productLabel =
                firstItem.productName ||
                firstItem.itemName ||
                firstItem.name ||
                "Product";
              const customerName = order.buyerName || "Customer";
              const paymentStatusValue = String(
                order.paymentStatus || "pending"
              ).toLowerCase();
              const isPaymentPaid = paymentStatusValue === "paid";
              const statusKey = String(
                order.status || "processing"
              ).toLowerCase();
              const statusClass =
                statusBadgeClasses[statusKey] ||
                "bg-slate-50 text-slate-600 border border-slate-200";
              const isSelected = selectedOrderIds.includes(orderKey);

              return (
                <div
                  key={orderKey}
                  className={`rounded-3xl border bg-white p-4 shadow-sm transition ${
                    isSelected
                      ? "border-blue-200 ring-1 ring-blue-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                        Order
                      </div>
                      <div className="mt-1 break-all text-lg font-semibold text-slate-900">
                        #{order.orderId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleRowSelection(order.orderId)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm"
                      aria-label={
                        isSelected
                          ? `Deselect order ${order.orderId}`
                          : `Select order ${order.orderId}`
                      }
                    >
                      {isSelected ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={productLabel}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src =
                              "https://placehold.co/80x80/f8fafc/e2e8f0?text=IMG";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          Img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {productLabel}
                      </p>
                      <p className="text-xs text-slate-500">{customerName}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="uppercase text-[10px] tracking-wide text-slate-400">
                        Placed
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="uppercase text-[10px] tracking-wide text-slate-400">
                        Amount
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="uppercase text-[10px] tracking-wide text-slate-400">
                        Status
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="uppercase text-[10px] tracking-wide text-slate-400">
                        Payment
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isPaymentPaid
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {`Payment: ${paymentStatusValue}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleViewOrder(order)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                      aria-label={`View order ${order.orderId}`}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoiceClick(order)}
                      disabled={downloadingOrderId === order.orderId || loading}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Download invoice for order ${order.orderId}`}
                    >
                      {downloadingOrderId === order.orderId ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOrderClick(order)}
                      disabled={deletingOrderId === order.orderId || loading}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Delete order ${order.orderId}`}
                    >
                      {deletingOrderId === order.orderId ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditOrderClick(order)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-purple-100 text-purple-600 transition hover:border-purple-200 hover:bg-purple-50"
                      aria-label={`Edit order ${order.orderId}`}
                    >
                      <PencilLine size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                const next = Number(event.target.value) || 10;
                setPageSize(next);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Page {page} of {meta.totalPages || 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loading}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 enabled:hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((prev) => (prev < meta.totalPages ? prev + 1 : prev))
              }
              disabled={page >= meta.totalPages || loading}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 enabled:hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {(viewingOrder || viewingOrderLoading || viewingOrderError) && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseView}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Order details
                  </p>
                  {viewingOrder && (
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      #{viewingOrder._id}
                    </h2>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseView}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  aria-label="Close order details"
                >
                  ×
                </button>
              </div>

              {viewingOrderLoading && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading order details...</span>
                </div>
              )}

              {!viewingOrderLoading && viewingOrderError && !viewingOrder && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {viewingOrderError}
                </div>
              )}

              {!viewingOrderLoading && viewingOrder && (
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Placed on {formatDate(viewingOrder.createdAt)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Payment status: {viewingOrder.payment?.status || "--"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <p>
                        Buyer: {viewingOrder.shippingAddress?.fullName || "--"}
                      </p>
                      {viewingOrder.shippingAddress?.mobile && (
                        <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                          <Phone size={12} className="text-slate-400" />
                          {viewingOrder.shippingAddress.mobile}
                        </p>
                      )}
                      {viewingOrder.shippingAddress?.email && (
                        <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                          <Mail size={12} className="text-slate-400" />
                          {viewingOrder.shippingAddress.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Items
                    </p>
                    <div className="mt-3 space-y-3">
                      {Array.isArray(viewingOrder.items) &&
                      viewingOrder.items.length > 0 ? (
                        viewingOrder.items.map((item, index) => (
                          <div
                            key={`${item.product || item.name}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name || "Product"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                    <Package size={14} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {item.name || "Product"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Qty: {item.quantity || 0}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-sm text-slate-700">
                              <p>{formatCurrency(item.price || 0)}</p>
                              <p className="text-xs text-slate-500">
                                Total:{" "}
                                {formatCurrency(
                                  (item.price || 0) * (item.quantity || 0)
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-sm text-slate-500">
                          No items recorded for this order.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Shipping address
                      </p>
                      <div className="mt-2 space-y-1">
                        <p>{viewingOrder.shippingAddress?.addressLine}</p>
                        <p>
                          {viewingOrder.shippingAddress?.city},{" "}
                          {viewingOrder.shippingAddress?.state} -{" "}
                          {viewingOrder.shippingAddress?.pincode}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Payment summary
                      </p>
                      <div className="mt-2 space-y-1">
                        <p>
                          Subtotal:{" "}
                          {formatCurrency(viewingOrder.pricing?.subtotal || 0)}
                        </p>
                        <p>
                          Shipping:{" "}
                          {formatCurrency(
                            viewingOrder.pricing?.shippingFee || 0
                          )}
                        </p>
                        <p>
                          Tax:{" "}
                          {formatCurrency(viewingOrder.pricing?.taxAmount || 0)}
                        </p>
                        <p className="font-semibold text-slate-900">
                          Total:{" "}
                          {formatCurrency(viewingOrder.pricing?.total || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingOrder && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseEdit}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
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
                    onChange={handleStatusFieldChange}
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
                      disabled={isPaymentStatusLocked}
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
                    {isPaymentStatusLocked ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Payment is already marked successful and cannot be
                        changed.
                      </p>
                    ) : null}
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
                    disabled={isDeliveryDateLocked}
                    onChange={handleEstimatedDeliveryChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {isDeliveryDateLocked ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Delivery date is locked because the order has already been{" "}
                      {editingOrder?.status === "returned"
                        ? "been resolved"
                        : "been delivered"}
                      .
                    </p>
                  ) : null}
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                {requiresPaymentSuccess && !isPaymentSuccessful ? (
                  <p className="mr-auto text-xs text-rose-500">
                    Mark payment as successful before setting the order to
                    Delivered.
                  </p>
                ) : null}
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
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !canSaveEdit}
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SellerOrders;
