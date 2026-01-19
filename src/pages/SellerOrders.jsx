import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import ExcelJS from "exceljs";
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
  { value: "rejected", label: "Rejected" },
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
  const location = useLocation();
  const locationState = useMemo(() => location.state || {}, [location.state]);
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
  const [page, setPage] = useState(() => Number(locationState.page) || 1);
  const [searchValue, setSearchValue] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [status, setStatus] = useState(() => locationState.status || "");
  const [paymentStatus, setPaymentStatus] = useState(
    () => locationState.paymentStatus || "",
  );
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
    rejectionPermanent: false,
  });
  const todayInputValue = useMemo(() => toDateInputValue(new Date()), []);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const lastNonDeliveredEstimateRef = useRef("");
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewingOrderLoading, setViewingOrderLoading] = useState(false);
  const [viewingOrderError, setViewingOrderError] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  const isViewingOverlayOpen = Boolean(
    viewingOrderLoading || viewingOrderError || viewingOrder,
  );
  const isEditingOverlayOpen = Boolean(editingOrder);
  const isAnyModalOpen = isViewingOverlayOpen || isEditingOverlayOpen;

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

  useEffect(() => {
    navigate(location.pathname, {
      replace: true,
      state: {
        ...locationState,
        status,
        paymentStatus,
        page,
      },
    });
  }, [status, paymentStatus, page, navigate, location.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isAnyModalOpen) {
      return;
    }

    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth;

    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isAnyModalOpen]);

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
    const targetOrders = Array.isArray(orders)
      ? selectedOrderIds.length
        ? orders.filter((order) => {
            const orderKey = order?.orderId ?? order?.id ?? order?._id;
            return (
              orderKey != null && selectedOrderIds.includes(String(orderKey))
            );
          })
        : orders
      : [];

    if (!targetOrders.length) {
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

    const toAbsoluteUrl = (value) => {
      const source = typeof value === "string" ? value.trim() : "";
      if (!source) {
        return "";
      }

      if (/^https?:\/\//i.test(source)) {
        return source;
      }

      if (source.startsWith("//")) {
        if (typeof window !== "undefined" && window.location?.protocol) {
          return `${window.location.protocol}${source}`;
        }
        return `https:${source}`;
      }

      try {
        const base =
          typeof window !== "undefined" && window.location?.origin
            ? window.location.origin
            : undefined;
        return base ? new URL(source, base).href : source;
      } catch (error) {
        return source;
      }
    };
    return targetOrders.map((order) => {
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
      const invoice = order.invoice || {};
      const invoiceUrl = toAbsoluteUrl(invoice.url || order.invoiceUrl || "");
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
      row["Primary Size"] = primaryItem.size || primaryItem.selectedSize || "";
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
      row["Invoice Number"] = invoice.number || order.invoiceNumber || "";
      row["Invoice Date"] = invoice.generatedAt
        ? formatDate(invoice.generatedAt)
        : order.invoiceDate
          ? formatDate(order.invoiceDate)
          : "--";
      row["Invoice"] = invoiceUrl;

      Object.defineProperty(row, "__qrfolioLink", {
        value: qrfolioUrl,
        enumerable: false,
      });
      Object.defineProperty(row, "__invoiceLink", {
        value: invoiceUrl,
        enumerable: false,
      });

      return row;
    });
  }, [orders, selectedOrderIds]);

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
          .join(","),
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

  const handleExportXlsx = useCallback(async () => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const header = Object.keys(rows[0]);
    const qrColumnIndex = header.indexOf("QR Folio Image");
    const invoiceColumnIndex = header.indexOf("Invoice");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    worksheet.addRow(header);

    if (qrColumnIndex !== -1) {
      worksheet.getColumn(qrColumnIndex + 1).width = 16;
    }
    if (invoiceColumnIndex !== -1) {
      worksheet.getColumn(invoiceColumnIndex + 1).width = 24;
    }

    const normalizeUrl = (value) => {
      if (!value || typeof value !== "string") {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      try {
        return new URL(trimmed).toString();
      } catch (_error) {
        try {
          const base = window.location?.origin || "";
          if (!base) return trimmed;
          return new URL(trimmed.replace(/^\/+/, ""), base).toString();
        } catch (_nestedError) {
          return trimmed;
        }
      }
    };

    const imageCache = new Map();

    const loadQrImage = async (rawUrl) => {
      const normalizedUrl = normalizeUrl(rawUrl);
      if (!normalizedUrl) {
        return null;
      }

      if (imageCache.has(normalizedUrl)) {
        return imageCache.get(normalizedUrl);
      }

      try {
        const response = await fetch(normalizedUrl, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const blob = await response.blob();
        if (!blob.type || !blob.type.startsWith("image/")) {
          imageCache.set(normalizedUrl, null);
          return null;
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const extension = blob.type.includes("png")
          ? "png"
          : blob.type.includes("jpeg") || blob.type.includes("jpg")
            ? "jpeg"
            : blob.type.includes("webp")
              ? "webp"
              : "png";

        const payload = { dataUrl, extension };
        imageCache.set(normalizedUrl, payload);
        return payload;
      } catch (error) {
        console.error(
          "Failed to load QR image for XLSX export",
          normalizedUrl,
          error,
        );
        imageCache.set(normalizedUrl, null);
        return null;
      }
    };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const excelRowIndex = index + 2; // account for header row

      const qrLink = row.__qrfolioLink || row["QR Folio Image"];
      const qrImage =
        qrColumnIndex !== -1 && qrLink ? await loadQrImage(qrLink) : null;

      const rowValues = header.map((key) => {
        if (key === "QR Folio Image") {
          return qrImage ? "" : row[key] || "";
        }
        return row[key];
      });

      const addedRow = worksheet.addRow(rowValues);

      if (qrImage && qrImage.dataUrl && qrColumnIndex !== -1) {
        const base64 =
          typeof qrImage.dataUrl === "string"
            ? qrImage.dataUrl.split(",")[1] || qrImage.dataUrl
            : qrImage.dataUrl;

        const imageId = workbook.addImage({
          base64,
          extension: qrImage.extension || "png",
        });

        addedRow.height = 70;

        worksheet.addImage(imageId, {
          tl: { col: qrColumnIndex, row: excelRowIndex - 1 },
          ext: { width: 72, height: 72 },
        });
      }

      if (invoiceColumnIndex !== -1) {
        const invoiceLink = row.__invoiceLink;
        if (invoiceLink) {
          const cell = addedRow.getCell(invoiceColumnIndex + 1);
          const text = row["Invoice"] || invoiceLink;
          cell.value = { text, hyperlink: invoiceLink };
        }
      }
    }

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `seller-orders-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("XLSX exported");
    } catch (error) {
      console.error("Failed to export XLSX with QR images", error);
      toast.error("Failed to export XLSX. Please try again.");
    }
  }, [buildExportRows]);

  const handleExportPdf = useCallback(async () => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error("No orders to export");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const columns = [
      { key: "orderId", label: "Order ID", width: 65 },
      { key: "status", label: "Status", width: 45 },
      { key: "payment", label: "Payment", width: 72 },
      { key: "total", label: "Total (INR)", width: 65, align: "right" },
      { key: "item", label: "Primary Item", width: 112 },
      { key: "size", label: "Size", width: 36, align: "center" },
      { key: "buyer", label: "Buyer", width: 80 },
      { key: "qty", label: "Qty", width: 30, align: "center" },
      { key: "ship", label: "Ship To", width: 102 },
      {
        key: "qr",
        label: "QR Code",
        width: 70,
        type: "image",
        imageWidth: 52,
        imageHeight: 52,
      },
      {
        key: "invoice",
        label: "Invoice",
        width: 88,
        type: "image",
        imageWidth: 68,
        imageHeight: 52,
      },
    ];

    const tableStartX = 32;
    const marginY = 72;
    const bottomMargin = 48;
    const headerHeight = 26;
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const bodyFontSize = 9;
    const bodyLineHeight = 12;

    let currentY = marginY;
    let pageWidth = doc.internal.pageSize.getWidth();
    let pageHeight = doc.internal.pageSize.getHeight();

    const ensurePageMetrics = () => {
      pageWidth = doc.internal.pageSize.getWidth();
      pageHeight = doc.internal.pageSize.getHeight();
    };

    const normalizeDisplayText = (value) => {
      if (value === null || value === undefined) {
        return "--";
      }

      const text = Array.isArray(value) ? value.join(" ") : String(value);
      return text.replace(/\u00a0/g, " ").trim() || "--";
    };

    const normalizeLink = (value) => {
      if (!value || typeof value !== "string") {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed || trimmed === "--") {
        return null;
      }

      try {
        return new URL(trimmed).toString();
      } catch (error) {
        try {
          const base = window.location?.origin || "";
          if (!base) return trimmed;
          return new URL(trimmed.replace(/^\/+/, ""), base).toString();
        } catch (_nestedError) {
          return trimmed;
        }
      }
    };

    const extractExtensionFromPath = (path) => {
      if (!path || typeof path !== "string") {
        return "";
      }

      const sanitized = path.split("?")[0].split("#")[0];
      const segments = sanitized.split("/").filter(Boolean);
      if (!segments.length) {
        return "";
      }

      const lastSegment = segments[segments.length - 1];
      const dotIndex = lastSegment.lastIndexOf(".");
      if (dotIndex === -1 || dotIndex === lastSegment.length - 1) {
        return "";
      }

      return lastSegment.slice(dotIndex + 1).toLowerCase();
    };

    const inferFileExtension = (value) => {
      if (!value || typeof value !== "string") {
        return "";
      }

      try {
        const parsed = new URL(value, window.location?.origin || undefined);
        return extractExtensionFromPath(parsed.pathname || "");
      } catch (_error) {
        return extractExtensionFromPath(value);
      }
    };

    const isLikelyImageLink = (value) => {
      const extension = inferFileExtension(value);
      if (!extension) {
        return false;
      }

      return ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(
        extension,
      );
    };

    const resolveInvoiceFallback = (url, attemptedImage) => {
      if (!url) {
        return "Invoice unavailable";
      }

      if (attemptedImage) {
        return "Invoice image unavailable";
      }

      const extension = inferFileExtension(url);
      if (!extension) {
        return "Invoice file";
      }

      if (extension === "pdf") {
        return "Invoice ";
      }

      return `Invoice ${extension.toUpperCase()}`;
    };

    const imageCache = new Map();

    const loadImageData = async (rawUrl) => {
      const normalizedUrl = normalizeLink(rawUrl);
      if (!normalizedUrl) {
        return null;
      }

      if (imageCache.has(normalizedUrl)) {
        return imageCache.get(normalizedUrl);
      }

      try {
        const response = await fetch(normalizedUrl, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const blob = await response.blob();
        if (!blob.type || !blob.type.startsWith("image/")) {
          imageCache.set(normalizedUrl, null);
          return null;
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const format = blob.type.includes("png")
          ? "PNG"
          : blob.type.includes("jpeg") || blob.type.includes("jpg")
            ? "JPEG"
            : blob.type.includes("webp")
              ? "WEBP"
              : undefined;

        const payload = { dataUrl, format };
        imageCache.set(normalizedUrl, payload);
        return payload;
      } catch (error) {
        console.error(
          "Failed to load image for PDF export",
          normalizedUrl,
          error,
        );
        imageCache.set(normalizedUrl, null);
        return null;
      }
    };

    const formatAmount = (value) => {
      const resolvedNumber = Number.isFinite(Number(value)) ? Number(value) : 0;

      const normalized = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(resolvedNumber);

      return `INR ${normalized}`;
    };

    const resolveCellValue = (value) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return {
          text: value.text !== undefined ? value.text : "--",
          link: normalizeLink(value.link || value.url),
        };
      }

      return {
        text: value,
        link: null,
      };
    };

    const drawColumnHeader = () => {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(15, 23, 42);
      doc.setDrawColor(15, 23, 42);

      let cursorX = tableStartX;
      columns.forEach((column) => {
        doc.setFillColor(15, 23, 42);
        doc.setTextColor(255, 255, 255);
        doc.rect(cursorX, currentY, column.width, headerHeight, "FD");
        const textY = currentY + headerHeight / 2 + 1;
        doc.text(column.label, cursorX + column.width / 2, textY, {
          align: "center",
          baseline: "middle",
        });
        cursorX += column.width;
      });

      currentY += headerHeight;
      doc.setDrawColor(221, 226, 233);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(30, 41, 59);
    };

    const renderPageHeader = (isFirstPage) => {
      ensurePageMetrics();
      const title = isFirstPage ? "Seller Orders" : "Seller Orders (cont.)";
      const titleOffset = isFirstPage ? 32 : 24;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(isFirstPage ? 16 : 12);
      doc.setTextColor(30, 41, 59);
      doc.text(title, pageWidth / 2, marginY - titleOffset, {
        align: "center",
      });

      currentY = marginY;
      drawColumnHeader();
    };

    const appendRow = (rowData, rowIndex) => {
      const cellInfos = columns.map((column) => {
        if (column.type === "image") {
          const cellValue = rowData[column.key] || {};
          const hasImage = Boolean(cellValue.image && cellValue.image.dataUrl);
          const linkUrl =
            typeof cellValue.url === "string" && cellValue.url.trim()
              ? cellValue.url.trim()
              : null;

          const fallbackLines = !hasImage
            ? doc.splitTextToSize(
                normalizeDisplayText(cellValue.fallback || "Image unavailable"),
                column.width - 12,
              )
            : [];

          const imageHeight = column.imageHeight || 52;
          const requiredHeight = hasImage
            ? Math.max(imageHeight + 16, 26)
            : Math.max((fallbackLines.length || 1) * bodyLineHeight + 16, 26);

          return {
            type: "image",
            hasImage,
            image: cellValue.image || null,
            url: linkUrl,
            fallbackLines,
            requiredHeight,
            imageWidth: column.imageWidth || 52,
            imageHeight,
          };
        }

        const { text, link } = resolveCellValue(rowData[column.key]);
        const normalizedText = normalizeDisplayText(
          typeof text === "string" ? text.replace(/\r?\n/g, "\n") : text,
        );
        const lines = doc.splitTextToSize(
          normalizedText || "--",
          column.width - 12,
        );

        return {
          type: "text",
          lines: lines.length ? lines : ["--"],
          link,
          requiredHeight: Math.max(lines.length * bodyLineHeight + 16, 26),
        };
      });

      const rowHeight = Math.max(
        ...cellInfos.map((entry) => entry.requiredHeight || 26),
      );

      if (currentY + rowHeight > pageHeight - bottomMargin) {
        doc.addPage({ orientation: "landscape", unit: "pt", format: "a4" });
        renderPageHeader(false);
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(248, 250, 252);
        doc.rect(tableStartX, currentY, tableWidth, rowHeight, "F");
      }

      doc.setDrawColor(221, 226, 233);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(30, 41, 59);

      let cursorX = tableStartX;
      columns.forEach((column, columnIndex) => {
        const cellInfo = cellInfos[columnIndex];
        doc.rect(cursorX, currentY, column.width, rowHeight);

        if (column.type === "image") {
          if (cellInfo.hasImage && cellInfo.image?.dataUrl) {
            const targetWidth = Math.min(cellInfo.imageWidth, column.width - 8);
            const targetHeight = cellInfo.imageHeight;
            const imageX = cursorX + (column.width - targetWidth) / 2;
            const imageY = currentY + (rowHeight - targetHeight) / 2;

            try {
              doc.addImage(
                cellInfo.image.dataUrl,
                cellInfo.image.format || "PNG",
                imageX,
                imageY,
                targetWidth,
                targetHeight,
              );

              if (cellInfo.url) {
                doc.link(imageX, imageY, targetWidth, targetHeight, {
                  url: cellInfo.url,
                });
              }
            } catch (error) {
              console.error("Failed to add image to PDF", error);
            }
          } else if (cellInfo.fallbackLines.length) {
            cellInfo.fallbackLines.forEach((line, lineIndex) => {
              const textY = currentY + 12 + lineIndex * bodyLineHeight;

              if (cellInfo.url && lineIndex === 0) {
                doc.setTextColor(37, 99, 235);
                doc.textWithLink(line, cursorX + 6, textY, {
                  url: cellInfo.url,
                });
                doc.setTextColor(30, 41, 59);
              } else {
                doc.text(line, cursorX + 6, textY, { baseline: "top" });
              }
            });
          }

          cursorX += column.width;
          return;
        }

        const { lines, link } = cellInfo;
        lines.forEach((line, lineIndex) => {
          const textY = currentY + 12 + lineIndex * bodyLineHeight;
          const align = column.align || "left";
          const textOptions = { baseline: "top" };

          if (align === "center") {
            textOptions.align = "center";
            if (link && lines.length === 1 && lineIndex === 0) {
              doc.setTextColor(37, 99, 235);
              doc.textWithLink(line, cursorX + column.width / 2, textY, {
                align: "center",
                url: link,
              });
              doc.setTextColor(30, 41, 59);
            } else {
              doc.text(line, cursorX + column.width / 2, textY, textOptions);
            }
          } else if (align === "right") {
            textOptions.align = "right";
            if (link && lines.length === 1 && lineIndex === 0) {
              doc.setTextColor(37, 99, 235);
              doc.textWithLink(line, cursorX + column.width - 6, textY, {
                align: "right",
                url: link,
              });
              doc.setTextColor(30, 41, 59);
            } else {
              doc.text(line, cursorX + column.width - 6, textY, textOptions);
            }
          } else {
            if (link && lines.length === 1 && lineIndex === 0) {
              doc.setTextColor(37, 99, 235);
              doc.textWithLink(line, cursorX + 6, textY, {
                url: link,
              });
              doc.setTextColor(30, 41, 59);
            } else {
              doc.text(line, cursorX + 6, textY, textOptions);
            }
          }
        });

        cursorX += column.width;
      });

      currentY += rowHeight;
    };

    renderPageHeader(true);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const paymentLabel = `${row["Payment Status"] || ""}$${
        row["Payment Method"] ? ` (${row["Payment Method"]})` : ""
      }`;
      const buyerLabel = [
        row["Buyer Name"],
        row["Buyer Email"],
        row["Buyer Phone"],
      ]
        .filter(Boolean)
        .join(" • ");
      const shippingAddress = (row["Shipping Address"] || "")
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join(", ");

      const qrLink = row.__qrfolioLink || row["QR Folio Image"];
      const invoiceLink = row.__invoiceLink || row["Invoice"];

      const normalizedQrUrl = normalizeLink(qrLink);
      const normalizedInvoiceUrl = normalizeLink(invoiceLink);
      const invoiceAssetUrl = normalizedInvoiceUrl || invoiceLink;
      const shouldAttemptInvoiceImage = isLikelyImageLink(invoiceAssetUrl);

      const [qrImage, invoiceImageRaw] = await Promise.all([
        loadImageData(qrLink),
        shouldAttemptInvoiceImage
          ? loadImageData(invoiceLink)
          : Promise.resolve(null),
      ]);

      const invoiceImage = shouldAttemptInvoiceImage ? invoiceImageRaw : null;

      const rowData = {
        orderId: normalizeDisplayText(row["Order ID"]),
        status: normalizeDisplayText(row.Status),
        payment: normalizeDisplayText(paymentLabel),
        total: formatAmount(row["Total Amount"]),
        item: normalizeDisplayText(
          `${row["Primary Item"] || "--"}${
            row["Primary SKU"] ? ` (SKU: ${row["Primary SKU"]})` : ""
          }`,
        ),
        size: normalizeDisplayText(row["Primary Size"] || "--"),
        buyer: normalizeDisplayText(buyerLabel),
        qty: normalizeDisplayText(row["Item Count"] ?? 0),
        ship: normalizeDisplayText(shippingAddress),
        qr: qrImage
          ? { image: qrImage, url: normalizedQrUrl }
          : {
              fallback: "QR image unavailable",
              url: normalizedQrUrl,
            },
        invoice: invoiceImage
          ? { image: invoiceImage, url: normalizedInvoiceUrl }
          : {
              fallback: resolveInvoiceFallback(
                invoiceAssetUrl,
                shouldAttemptInvoiceImage,
              ),
              url: normalizedInvoiceUrl,
            },
      };

      appendRow(rowData, index);
    }

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
        : [...prev, key],
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
      order.paymentStatus || "pending",
    ).toLowerCase();
    const hasInvoiceAsset = Boolean(
      order?.invoice?.url || order?.invoiceUrl || order?.invoice?.number,
    );

    if (!hasInvoiceAsset && paymentStatusValue !== "paid") {
      toast.error(
        "Invoice will be available once payment succeeds or the seller updates it manually.",
      );
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
      "Are you sure you want to delete this order?",
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
      }? This cannot be undone.`,
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
        rejectionPermanent: Boolean(fullOrder.rejectionPermanent),
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
        rejectionPermanent:
          nextStatusLower === "rejected" ? prev.rejectionPermanent : false,
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
        (editingOrder.status || "").toString().toLowerCase(),
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
  const isRejectionLockActive =
    normalizedFormStatus === "rejected" && Boolean(editForm.rejectionPermanent);

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
        "Payment must be successful before marking an order as delivered.",
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

      const nextStatusLower = (editForm.status || "").toString().toLowerCase();

      if (nextStatusLower === "rejected") {
        payload.rejectionPermanent = Boolean(editForm.rejectionPermanent);
      } else if (
        editingOrder?.rejectionPermanent &&
        String(editingOrder.status || "").toLowerCase() === "rejected"
      ) {
        payload.rejectionPermanent = false;
      }

      const targetId = editingOrder.orderId || editingOrder._id;
      await updateOrder(targetId, payload);

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

      <section className="overflow-visible md:overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
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
                    className="absolute left-0 top-full z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white text-left shadow-xl origin-top-left sm:left-auto sm:right-0 sm:origin-top-right"
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
                    order.paymentStatus || "pending",
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
                order.paymentStatus || "pending",
              ).toLowerCase();
              const isPaymentPaid = paymentStatusValue === "paid";
              const statusKey = String(
                order.status || "processing",
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

      {portalTarget &&
        createPortal(
          <>
            <AnimatePresence>
              {(viewingOrder || viewingOrderLoading || viewingOrderError) && (
                <motion.div
                  className="fixed inset-0 z-[1200] flex h-screen w-screen items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
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
                    className="modal-scroll w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl md:max-h-[calc(100vh-4rem)]"
                    data-modal-dvh="true"
                    style={{ maxHeight: "calc(100vh - 2.5rem)" }}
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

                    {!viewingOrderLoading &&
                      viewingOrderError &&
                      !viewingOrder && (
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
                              Payment status:{" "}
                              {viewingOrder.payment?.status || "--"}
                            </p>
                          </div>
                          <div className="text-right text-sm text-slate-600">
                            <p>
                              Buyer:{" "}
                              {viewingOrder.shippingAddress?.fullName || "--"}
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
                                        (item.price || 0) *
                                          (item.quantity || 0),
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
                                {formatCurrency(
                                  viewingOrder.pricing?.subtotal || 0,
                                )}
                              </p>
                              <p>
                                Shipping:{" "}
                                {formatCurrency(
                                  viewingOrder.pricing?.shippingFee || 0,
                                )}
                              </p>
                              <p>
                                Tax:{" "}
                                {formatCurrency(
                                  viewingOrder.pricing?.taxAmount || 0,
                                )}
                              </p>
                              <p className="font-semibold text-slate-900">
                                Total:{" "}
                                {formatCurrency(
                                  viewingOrder.pricing?.total || 0,
                                )}
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
                  className="fixed inset-0 z-[1200] flex h-screen w-screen items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
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
                          disabled={isRejectionLockActive}
                        >
                          <option value="confirmed">Order Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">
                            Out for Delivery
                          </option>
                          <option value="delivered">Delivered</option>
                          <option value="returned">Returned</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </label>

                      {String(editForm.status || "").toLowerCase() ===
                        "rejected" && (
                        <label className="mt-1 flex items-center gap-2 text-xs font-medium text-rose-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            checked={Boolean(editForm.rejectionPermanent)}
                            onChange={(event) =>
                              handleEditFieldChange(
                                "rejectionPermanent",
                                event.target.checked,
                              )
                            }
                          />
                          <span>
                            Lock status after rejection (prevent further status
                            changes)
                          </span>
                        </label>
                      )}

                      {isRejectionLockActive ? (
                        <p className="text-xs text-rose-500">
                          Unlock the toggle above to change the order status.
                        </p>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Payment Status
                          <select
                            value={editForm.paymentStatus}
                            disabled={isPaymentStatusLocked}
                            onChange={(event) =>
                              handleEditFieldChange(
                                "paymentStatus",
                                event.target.value,
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
                                event.target.value,
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
                            Delivery date is locked because the order has
                            already been{" "}
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
          </>,
          portalTarget,
        )}
    </motion.div>
  );
};

export default SellerOrders;
