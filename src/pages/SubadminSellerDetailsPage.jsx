import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  Filter,
  Search,
  Download,
  PencilLine,
  X,
  ImageOff,
  Loader2,
  Tag,
  ShieldCheck,
  Layers,
  CalendarDays,
  AlertTriangle,
  Gift,
  QrCode,
} from "lucide-react";
import SubadminSidebar from "../components/subadmin/SubadminSidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchSubadminSellerProducts,
  fetchSubadminSellerOrders,
  fetchSubadminSellerCoupons,
} from "../services/subadminApi";
import {
  downloadOrderInvoice,
  fetchOrderById,
  updateOrder,
} from "../utils/api";
import { downloadQrAsPdf } from "../utils/downloadQr";

const ORDER_STATUS_OPTIONS = [
  "",
  "processing",
  "confirmed",
  "picked_up",
  "shipped",
  "out_for_delivery",
  "delivered",
  "returned",
  "rejected",
];

const ORDER_STATUS_CARD_CONFIG = [
  {
    key: "processing",
    label: "Processing",
    accent: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    accent: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    key: "shipped",
    label: "Shipped",
    accent: "text-sky-600",
    badge: "bg-sky-100 text-sky-700",
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    accent: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    key: "delivered",
    label: "Delivered",
    accent: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "returned",
    label: "Return / Replace",
    accent: "text-rose-600",
    badge: "bg-rose-100 text-rose-700",
  },
];

const PRODUCT_AVAILABILITY_OPTIONS = [
  { value: "all", label: "All availability" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

const PRODUCT_DATE_FILTER_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
];

const COUPON_STATUS_OPTIONS = [
  { value: "all", label: "All coupons" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "redeemed", label: "Redeemed" },
  { value: "not_redeemed", label: "Not redeemed" },
  { value: "expired", label: "Expired" },
];

const toDateInputValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  const adjusted = new Date(parsed.getTime() - tzOffsetMs);
  return adjusted.toISOString().slice(0, 10);
};

const getOrderKey = (order) => {
  if (!order) return "";
  return order.orderId || order.id || order._id || "";
};

const COURIER_OPTIONS = [
  { value: "Triupati", label: "Triupati" },
  { value: "Xpressbees Logistics", label: "Xpressbees Logistics" },
  { value: "Delhivery Courier", label: "Delhivery Courier" },
  { value: "India Post", label: "India Post" },
];

const SubadminSellerDetailsPage = () => {
  const { sellerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const initialTab = location.state?.initialTab;

  const [activeTab, setActiveTab] = useState(() => initialTab || "products");

  const handleChangeTab = (tab) => {
    setActiveTab(tab);
    if (location.state?.initialTab) {
      navigate(location.pathname, {
        replace: true,
        state: {
          ...location.state,
          initialTab: tab,
        },
      });
    }
  };

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveTab(location.state.initialTab);
    }
  }, [location.state?.initialTab]);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [viewProduct, setViewProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState("");
  const [productAvailabilityFilter, setProductAvailabilityFilter] =
    useState("all");
  const [productDateFilter, setProductDateFilter] = useState("all");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    paymentStatus: "",
    paymentMethod: "",
    estimatedDeliveryDate: "",
    rejectionPermanent: false,
    courier: "Triupati",
    trackingId: "",
  });
  const todayInputValue = useMemo(() => toDateInputValue(new Date()), []);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const lastNonDeliveredEstimateRef = useRef("");
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [downloadingQrId, setDownloadingQrId] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const selectAllCheckboxRef = useRef(null);

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState("");
  const [couponSearch, setCouponSearch] = useState("");
  const [couponStatusFilter, setCouponStatusFilter] = useState("all");

  const filteredCoupons = useMemo(() => {
    const query = couponSearch.trim().toLowerCase();
    const now = new Date();

    return coupons.filter((coupon) => {
      const isActive = coupon.isActive !== false;
      const maxRedemptions = Number(coupon.maxRedemptions) || 0;
      const usageCount = Number(coupon.usageCount) || 0;
      const isRedeemed = usageCount > 0;
      const endDate = coupon.endDate ? new Date(coupon.endDate) : null;
      const isExpired =
        endDate && !Number.isNaN(endDate.getTime()) && endDate < now;

      const matchesStatus = (() => {
        switch (couponStatusFilter) {
          case "active":
            return isActive && !isExpired;
          case "inactive":
            return !isActive;
          case "redeemed":
            return isRedeemed;
          case "not_redeemed":
            return !isRedeemed;
          case "expired":
            return isExpired;
          default:
            return true;
        }
      })();

      if (!matchesStatus) return false;

      if (!query) return true;

      const values = [
        coupon.code,
        coupon.description,
        coupon.discountType,
        coupon.discountValue,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return values.some((value) => value.includes(query));
    });
  }, [coupons, couponSearch, couponStatusFilter]);

  const couponSummary = useMemo(() => {
    const summary = {
      total: filteredCoupons.length,
      active: 0,
      singleUse: 0,
      multiUse: 0,
      expiredSingle: 0,
      expiredMulti: 0,
      redeemed: 0,
      notRedeemed: 0,
    };

    const now = new Date();

    filteredCoupons.forEach((coupon) => {
      const isActive = coupon.isActive !== false;
      if (isActive) summary.active += 1;

      const maxRedemptions = Number(coupon.maxRedemptions) || 0;
      const totalUsage = Number(coupon.usageCount) || 0;
      const isSingleUse = maxRedemptions <= 1;

      if (isSingleUse) {
        summary.singleUse += 1;
      } else {
        summary.multiUse += 1;
      }

      const endDate = coupon.endDate ? new Date(coupon.endDate) : null;
      const isExpired =
        endDate && !Number.isNaN(endDate.getTime()) && endDate < now;
      if (isExpired) {
        if (isSingleUse) {
          summary.expiredSingle += 1;
        } else {
          summary.expiredMulti += 1;
        }
      }

      if (totalUsage > 0) {
        summary.redeemed += 1;
      } else {
        summary.notRedeemed += 1;
      }
    });

    return summary;
  }, [filteredCoupons]);

  const couponCards = useMemo(
    () => [
      {
        key: "total",
        label: "Total Coupons",
        value: couponSummary.total,
        icon: Tag,
        iconBg: "bg-blue-100 text-blue-600",
        helper:
          coupons.length !== couponSummary.total
            ? `of ${coupons.length}`
            : null,
      },
      {
        key: "active",
        label: "Active",
        value: couponSummary.active,
        icon: ShieldCheck,
        iconBg: "bg-emerald-100 text-emerald-600",
      },
      {
        key: "single",
        label: "Single Use",
        value: couponSummary.singleUse,
        icon: Layers,
        iconBg: "bg-purple-100 text-purple-600",
      },
      {
        key: "multi",
        label: "Multi Use",
        value: couponSummary.multiUse,
        icon: CalendarDays,
        iconBg: "bg-amber-100 text-amber-600",
      },
      {
        key: "expiredSingle",
        label: "Expired Single Use",
        value: couponSummary.expiredSingle,
        icon: AlertTriangle,
        iconBg: "bg-slate-100 text-slate-500",
      },
      {
        key: "expiredMulti",
        label: "Expired Multi Use",
        value: couponSummary.expiredMulti,
        icon: AlertTriangle,
        iconBg: "bg-orange-100 text-orange-600",
      },
      {
        key: "redeemed",
        label: "Redeemed Coupons",
        value: couponSummary.redeemed,
        icon: Gift,
        iconBg: "bg-emerald-100 text-emerald-600",
      },
      {
        key: "notRedeemed",
        label: "Not Redeemed",
        value: couponSummary.notRedeemed,
        icon: Gift,
        iconBg: "bg-indigo-100 text-indigo-600",
      },
    ],
    [couponSummary, coupons.length],
  );

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setProductsError("");
      const data = await fetchSubadminSellerProducts({ sellerId });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load seller products for subadmin", err);
      setProductsError(err.message || "Unable to load seller products.");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [sellerId]);

  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setOrdersError("");
      const params = { sellerId };
      if (ordersStatusFilter) {
        params.status = ordersStatusFilter;
      }
      const data = await fetchSubadminSellerOrders(params);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load seller orders for subadmin", err);
      setOrdersError(err.message || "Unable to load seller orders.");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [sellerId, ordersStatusFilter]);

  const loadCoupons = useCallback(async () => {
    try {
      setCouponsLoading(true);
      setCouponsError("");
      const data = await fetchSubadminSellerCoupons({ sellerId });
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load seller coupons for subadmin", err);
      setCouponsError(err.message || "Unable to load seller coupons.");
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;
    loadProducts();
    loadOrders();
    loadCoupons();
  }, [sellerId, loadProducts, loadOrders, loadCoupons]);

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderIds((prev) => (prev.length ? [] : prev));
      return;
    }

    const validKeys = new Set(
      orders.map((order) => String(getOrderKey(order))).filter(Boolean),
    );

    setSelectedOrderIds((prev) => {
      const pruned = prev.filter((id) => validKeys.has(String(id)));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [orders]);

  const productStatusOptions = useMemo(() => {
    const statuses = new Set();
    products.forEach((product) => {
      if (product?.status) {
        statuses.add(product.status);
      }
    });
    return ["", ...Array.from(statuses)];
  }, [products]);

  const productsSortedByDate = useMemo(() => {
    return [...products].sort((a, b) => {
      const aCreated = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return productsSortedByDate.filter((product) => {
      if (!product) return false;

      const matchesSearch = query
        ? [product.name, product.sku, product.brand]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => value.includes(query))
        : true;

      const matchesStatus = productStatusFilter
        ? String(product.status || "").toLowerCase() ===
          productStatusFilter.toLowerCase()
        : true;

      const stockValue = Number(product.stock);
      const hasStockNumber = Number.isFinite(stockValue);
      const threshold = Number(product.lowStockThreshold);
      const safeThreshold =
        Number.isFinite(threshold) && threshold > 0 ? threshold : 5;
      let matchesAvailability = true;

      if (productAvailabilityFilter === "in_stock") {
        matchesAvailability = hasStockNumber
          ? stockValue > safeThreshold
          : true;
      } else if (productAvailabilityFilter === "low_stock") {
        matchesAvailability = hasStockNumber
          ? stockValue > 0 && stockValue <= safeThreshold
          : false;
      } else if (productAvailabilityFilter === "out_of_stock") {
        matchesAvailability = hasStockNumber ? stockValue <= 0 : false;
      }

      let matchesDate = true;
      if (productDateFilter !== "all") {
        if (!product?.createdAt) {
          matchesDate = false;
        } else {
          const createdAt = new Date(product.createdAt);
          if (Number.isNaN(createdAt.getTime())) {
            matchesDate = false;
          } else {
            const diffMs = Date.now() - createdAt.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (productDateFilter === "last_7_days") {
              matchesDate = diffDays <= 7;
            } else if (productDateFilter === "last_30_days") {
              matchesDate = diffDays <= 30;
            } else if (productDateFilter === "last_90_days") {
              matchesDate = diffDays <= 90;
            }
          }
        }
      }

      return (
        matchesSearch && matchesStatus && matchesAvailability && matchesDate
      );
    });
  }, [
    productsSortedByDate,
    productSearch,
    productStatusFilter,
    productAvailabilityFilter,
    productDateFilter,
  ]);

  const resolveOrderTotal = (order) => {
    if (!order) return 0;
    const totalCandidates = [
      order.totalAmount,
      order.orderPricing?.total,
      order.pricing?.total,
      order.totals?.grandTotal,
      order.totals?.net,
      order.orderPricing?.grandTotal,
      order.total,
    ];

    const resolved = totalCandidates.find((value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric > 0;
    });

    return Number(resolved ?? 0);
  };

  const resolveCustomerName = (order) => {
    if (!order) return "Customer";
    return (
      order.customerName ||
      order.buyer?.name ||
      order.shippingAddress?.fullName ||
      order.shippingAddress?.firstName ||
      order.shipping?.recipientName ||
      "Customer"
    );
  };

  const resolveCustomerPhone = (order) => {
    if (!order) return "--";
    return (
      order.buyerPhone ||
      order.customerPhone ||
      order.shippingAddress?.mobile ||
      order.shipping?.mobile ||
      order.buyer?.phone ||
      order.buyer?.mobile ||
      "--"
    );
  };

  const resolveCustomerEmail = (order) => {
    if (!order) return "--";
    const address = order.shippingAddress || order.shipping || {};
    return (
      order.buyerEmail ||
      order.customerEmail ||
      address.email ||
      order.buyer?.email ||
      "--"
    );
  };

  const filteredOrders = useMemo(() => {
    const query = ordersSearch.trim().toLowerCase();
    const sorted = [...orders].sort((a, b) => {
      const aCreated = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });

    return sorted.filter((order) => {
      const matchesQuery = query
        ? [
            order.orderId,
            order._id,
            order.buyer?.name,
            order.shippingAddress?.fullName,
            order.shipping?.trackingId,
            order.buyerEmail,
            order.customerEmail,
            order.shippingAddress?.email,
            order.shipping?.email,
            order.buyer?.email,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => value.includes(query))
        : true;
      return matchesQuery;
    });
  }, [orders, ordersSearch]);

  const selectedOrderIdSet = useMemo(
    () => new Set(selectedOrderIds.map((value) => String(value))),
    [selectedOrderIds],
  );

  const filteredSelectedCount = useMemo(() => {
    if (!filteredOrders.length || selectedOrderIdSet.size === 0) {
      return 0;
    }

    let count = 0;
    filteredOrders.forEach((order) => {
      const key = String(getOrderKey(order));
      if (key && selectedOrderIdSet.has(key)) {
        count += 1;
      }
    });
    return count;
  }, [filteredOrders, selectedOrderIdSet]);

  useEffect(() => {
    const checkbox = selectAllCheckboxRef.current;
    if (!checkbox) return;

    if (!filteredOrders.length) {
      checkbox.indeterminate = false;
      return;
    }

    checkbox.indeterminate =
      filteredSelectedCount > 0 &&
      filteredSelectedCount < filteredOrders.length;
  }, [filteredOrders, filteredSelectedCount]);

  const handleToggleSelectAll = useCallback(() => {
    if (!filteredOrders.length) {
      setSelectedOrderIds([]);
      return;
    }

    const visibleKeys = filteredOrders
      .map((order) => String(getOrderKey(order)))
      .filter(Boolean);

    const hasUnselectedVisible = visibleKeys.some(
      (key) => !selectedOrderIdSet.has(key),
    );

    if (hasUnselectedVisible) {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev.map((id) => String(id)));
        visibleKeys.forEach((key) => next.add(key));
        return Array.from(next);
      });
      return;
    }

    const keysToRemove = new Set(visibleKeys);
    setSelectedOrderIds((prev) =>
      prev.filter((id) => !keysToRemove.has(String(id))),
    );
  }, [filteredOrders, selectedOrderIdSet]);

  const handleToggleRowSelection = useCallback((orderId) => {
    const key = String(orderId || "");
    if (!key) return;

    setSelectedOrderIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
    );
  }, []);

  const buildExportRows = useCallback(() => {
    if (!Array.isArray(filteredOrders) || !filteredOrders.length) {
      return [];
    }

    const targetOrders =
      selectedOrderIdSet.size > 0
        ? filteredOrders.filter((order) => {
            const key = String(getOrderKey(order));
            return key && selectedOrderIdSet.has(key);
          })
        : filteredOrders;

    if (!targetOrders.length) {
      return [];
    }

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
      } catch (_error) {
        return source;
      }
    };

    return targetOrders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const primaryItem = items[0] || {};
      const address = order.shippingAddress || order.shipping || {};
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
        } catch (_error) {
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
      row["Primary Size"] =
        primaryItem.size ||
        primaryItem.selectedSize ||
        primaryItem.options?.size ||
        "";
      row["Buyer Name"] =
        order.buyerName || order.customerName || address.fullName || "";
      row["Buyer Email"] =
        order.buyerEmail || order.customerEmail || address.email || "";
      row["Buyer Phone"] = order.buyerPhone || address.mobile || "";
      row["Created At"] = order.createdAt
        ? new Date(order.createdAt).toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
      row["Estimated Delivery"] = order.estimatedDeliveryDate
        ? new Date(order.estimatedDeliveryDate).toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--";
      row["Shipping Address"] = formatSubadminShippingAddress(address);
      row["QR Folio Image"] = qrfolioUrl || resolveQrfolioFallback();
      row["Invoice Number"] = invoice.number || order.invoiceNumber || "";
      row["Invoice Date"] = invoice.generatedAt
        ? new Date(invoice.generatedAt).toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : order.invoiceDate
          ? new Date(order.invoiceDate).toLocaleString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
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
      Object.defineProperty(row, "__shippingAddress", {
        value: address,
        enumerable: false,
      });
      Object.defineProperty(row, "__itemCount", {
        value: items.length,
        enumerable: false,
      });
      Object.defineProperty(row, "__primaryItem", {
        value: primaryItem,
        enumerable: false,
      });
      Object.defineProperty(row, "__qrPdfLink", {
        value: order.qrfolio?.pdfUrl || "",
        enumerable: false,
      });

      return row;
    });
  }, [filteredOrders, selectedOrderIdSet]);

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
    link.download = `seller-orders-${new Date().toISOString().slice(0, 10)}.csv`;
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
      { key: "orderId", label: "Order ID", width: 60 },
      { key: "status", label: "Status", width: 40 },
      { key: "payment", label: "Payment", width: 62 },
      { key: "total", label: "Total (INR)", width: 60, align: "right" },
      { key: "item", label: "Primary Item", width: 100 },
      { key: "size", label: "Size", width: 34, align: "center" },
      { key: "buyer", label: "Buyer", width: 74 },
      { key: "qty", label: "Qty", width: 28, align: "center" },
      { key: "ship", label: "Ship To", width: 96 },
      {
        key: "qr",
        label: "QR Code",
        width: 66,
        type: "image",
        imageWidth: 52,
        imageHeight: 52,
      },
      {
        key: "qrPdf",
        label: "QR PDF",
        width: 62,
        align: "center",
      },
      {
        key: "invoice",
        label: "Invoice",
        width: 80,
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
      const rawPaymentStatus = row["Payment Status"] || "";
      const rawPaymentMethod = row["Payment Method"] || "";
      const paymentLabel = `${rawPaymentStatus || ""}`;
      const paymentWithMethod = rawPaymentMethod
        ? `${paymentLabel}${paymentLabel ? " " : ""}(${rawPaymentMethod})`
        : paymentLabel;
      const buyerLabel = [
        row["Buyer Name"],
        row["Buyer Email"],
        row["Buyer Phone"],
      ]
        .filter(Boolean)
        .join(" • ");
      const shippingAddress = formatSubadminShippingAddress(
        row.__shippingAddress,
      )
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join("\n");

      const qrLink = row.__qrfolioLink || row["QR Folio Image"];
      const invoiceLink = row.__invoiceLink || row["Invoice"];

      const normalizedQrUrl = normalizeLink(qrLink);
      const normalizedInvoiceUrl = normalizeLink(invoiceLink);
      const invoiceAssetUrl = normalizedInvoiceUrl || invoiceLink;
      const shouldAttemptInvoiceImage = isLikelyImageLink(invoiceAssetUrl);

      const qrPdfLink = row.__qrPdfLink;

      const [qrImage, invoiceImage, qrPdfUri] = await Promise.all([
        loadImageData(qrLink),
        shouldAttemptInvoiceImage
          ? loadImageData(invoiceLink)
          : Promise.resolve(null),
        qrPdfLink
          ? Promise.resolve(qrPdfLink)
          : normalizedQrUrl
            ? downloadQrAsPdf({
                qrUrl: normalizedQrUrl,
                orderId: row.orderId,
                filePrefix: "order-qr",
                returnDataUri: true,
              }).catch((error) => {
                console.error("Failed to build QR PDF for export", error);
                return null;
              })
            : Promise.resolve(null),
      ]);

      const formattedPayment = normalizeDisplayText(paymentWithMethod);

      const sourceItem = row.__primaryItem || {};
      const itemLabelRaw =
        row["Primary Item"] ||
        sourceItem.productName ||
        sourceItem.name ||
        "--";
      const skuSuffix = row["Primary SKU"]
        ? ` (SKU: ${row["Primary SKU"]})`
        : "";
      const sizeRaw =
        row["Primary Size"] ||
        sourceItem.size ||
        sourceItem.selectedSize ||
        sourceItem.options?.size ||
        "";
      const itemCount = Number.isFinite(Number(row.__itemCount))
        ? Number(row.__itemCount)
        : Number(row["Item Count"] || 0);

      const rowData = {
        orderId: normalizeDisplayText(row["Order ID"]),
        status: normalizeDisplayText(row.Status),
        payment: formattedPayment,
        total: formatAmount(row["Total Amount"]),
        item: normalizeDisplayText(`${itemLabelRaw}${skuSuffix}`),
        size: normalizeDisplayText(sizeRaw || "--"),
        buyer: normalizeDisplayText(buyerLabel),
        qty: normalizeDisplayText(itemCount),
        ship: shippingAddress ? normalizeDisplayText(shippingAddress) : "--",
        qr: qrImage
          ? { image: qrImage, url: normalizedQrUrl }
          : {
              fallback: "QR image unavailable",
              url: normalizedQrUrl,
            },
        qrPdf: qrPdfUri
          ? { text: "Download", link: qrPdfUri }
          : normalizedQrUrl
            ? { text: "Open QR", link: normalizedQrUrl }
            : "--",
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

  const orderSummaryCards = useMemo(() => {
    const counts = ORDER_STATUS_CARD_CONFIG.reduce((accumulator, config) => {
      accumulator[config.key] = 0;
      return accumulator;
    }, {});

    filteredOrders.forEach((order) => {
      const statusKey = String(order.orderStatus || order.status || "")
        .toLowerCase()
        .trim();
      if (statusKey && counts[statusKey] !== undefined) {
        counts[statusKey] += 1;
      }
    });

    return ORDER_STATUS_CARD_CONFIG.map((config) => ({
      ...config,
      value: counts[config.key] ?? 0,
    }));
  }, [filteredOrders]);

  const handleOpenEditShipping = async (order) => {
    const orderKey = getOrderKey(order);
    if (!orderKey) {
      toast.error("Order reference unavailable");
      return;
    }

    try {
      const response = await fetchOrderById(orderKey);
      const fullOrder = response?.data;

      if (!fullOrder) {
        throw new Error("Order details not found");
      }

      const defaultCourier =
        (fullOrder.shipping && fullOrder.shipping.courier) || "Triupati";

      const nextForm = {
        status: fullOrder.status || "processing",
        paymentStatus: fullOrder.payment?.status || "",
        paymentMethod: fullOrder.payment?.method || "",
        estimatedDeliveryDate:
          toDateInputValue(fullOrder.estimatedDeliveryDate) || "",
        rejectionPermanent: Boolean(fullOrder.rejectionPermanent),
        courier: defaultCourier,
        trackingId: fullOrder.shipping?.trackingId || "",
      };

      setEditingOrder(fullOrder);
      setEditForm(nextForm);

      const initialEstimate =
        String(nextForm.status || "").toLowerCase() === "delivered"
          ? ""
          : nextForm.estimatedDeliveryDate;
      lastNonDeliveredEstimateRef.current = initialEstimate || "";
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

  const handleSaveShipping = async (event) => {
    event.preventDefault();
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

      if (editForm.courier) {
        payload.courier = editForm.courier;
      }

      if (editForm.trackingId) {
        payload.trackingId = editForm.trackingId;
      }

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
      await loadOrders();
      setEditingOrder(null);
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Failed to update order";
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDownloadInvoice = async (order) => {
    const orderKey = order.orderId || order.id || order._id;
    if (!orderKey) return;
    try {
      const keyString = String(orderKey);
      setDownloadingInvoiceId(keyString);
      const response = await downloadOrderInvoice(orderKey);
      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || `invoice-${keyString}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download invoice", err);
      window.alert(err.message || "Failed to download invoice.");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const { name: adminName, username } = user || {};

  const resolveProductImage = (product) => {
    if (!product) return "";
    if (product.thumbnail) return product.thumbnail;
    if (Array.isArray(product.images) && product.images.length) {
      return product.images.find((url) => Boolean(url)) || "";
    }
    if (Array.isArray(product.gallery) && product.gallery.length) {
      return product.gallery.find((url) => Boolean(url)) || "";
    }
    return "";
  };

  const collectAdditionalImages = (product, primaryUrl) => {
    if (!product) return [];
    const candidates = [
      ...(Array.isArray(product.images) ? product.images : []),
      ...(Array.isArray(product.gallery) ? product.gallery : []),
    ].filter(Boolean);

    const seen = new Set();
    const extras = [];

    candidates.forEach((url) => {
      if (primaryUrl && url === primaryUrl) return;
      if (seen.has(url)) return;
      seen.add(url);
      extras.push(url);
    });

    return extras;
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const formatSubadminShippingAddress = (address = {}) => {
    if (!address || typeof address !== "object") {
      return "--";
    }

    const contact = [address.fullName, address.mobile]
      .filter(Boolean)
      .join(" • ");
    const emailLine = address.email ? `Email: ${address.email}` : "";
    const street = [address.addressLine, address.landmark]
      .filter(Boolean)
      .join(", ");
    const city = [address.city, address.district].filter(Boolean).join(", ");
    const state = [address.state, address.pincode].filter(Boolean).join(" - ");

    const lines = [contact, emailLine, street, city, state]
      .filter((entry) => entry && entry.trim().length)
      .join("\n");

    return lines || "--";
  };

  const primaryImage = resolveProductImage(viewProduct);
  const secondaryImages = collectAdditionalImages(viewProduct, primaryImage);

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <SubadminSidebar
          active="Dashboard"
          className="hidden lg:flex lg:w-64 lg:flex-none"
          onNavigate={() => setIsSidebarOpen(false)}
        />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex lg:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="bg-white w-72 max-w-sm h-full shadow-xl"
              >
                <SubadminSidebar
                  active="Dashboard"
                  className="flex w-full"
                  onNavigate={() => setIsSidebarOpen(false)}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex-1 bg-black/30"
                aria-label="Close sidebar"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            activeRange="All Time"
            onSelectRange={() => {}}
            adminName={adminName || username || "Subadmin"}
            adminRole="Sub Admin"
            notifications={{
              pendingOrders: 0,
              shippedOrders: 0,
              deliveredOrders: 0,
            }}
            showRangeSelector={false}
            showNotifications={false}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">
                Subadmin / Sellers / Details
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Seller Details
              </h1>
              <p className="text-xs text-slate-500">
                Seller ID: <span className="font-mono">{sellerId}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleChangeTab("products")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  activeTab === "products"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => handleChangeTab("orders")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  activeTab === "orders"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                Orders
              </button>
              <button
                type="button"
                onClick={() => handleChangeTab("coupons")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                  activeTab === "coupons"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                Coupons
              </button>
            </div>

            {activeTab === "products" && (
              <section className="space-y-4">
                <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-900">
                        Products
                      </h2>
                      {productsLoading && (
                        <p className="text-xs text-slate-500">
                          Loading products...
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {productsLoading
                        ? "Fetching latest products..."
                        : `Showing ${filteredProducts.length} of ${products.length} items`}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
                    <div className="relative w-full md:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(event) =>
                          setProductSearch(event.target.value)
                        }
                        placeholder="Search name, SKU or brand"
                        className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <select
                        value={productStatusFilter}
                        onChange={(event) =>
                          setProductStatusFilter(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {productStatusOptions.map((status) => (
                          <option key={status || "all"} value={status}>
                            {status
                              ? status.replace(/_/g, " ")
                              : "All statuses"}
                          </option>
                        ))}
                      </select>
                      <select
                        value={productAvailabilityFilter}
                        onChange={(event) =>
                          setProductAvailabilityFilter(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {PRODUCT_AVAILABILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={productDateFilter}
                        onChange={(event) =>
                          setProductDateFilter(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {PRODUCT_DATE_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </header>
                {productsError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {productsError}
                  </div>
                )}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-16">
                          S/N
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Image
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          SKU
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Price
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Status
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">
                          View
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {productsLoading ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            Loading products...
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No products found for this seller.
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No products match the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product, index) => (
                          <tr key={product._id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 align-middle text-xs font-semibold text-slate-500">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 align-middle">
                              {resolveProductImage(product) ? (
                                <img
                                  src={resolveProductImage(product)}
                                  alt={product.name || product.sku || "Product"}
                                  className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                                  <ImageOff size={16} />
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle text-slate-800">
                              {product.name || "--"}
                            </td>
                            <td className="px-3 py-2 align-middle text-slate-600">
                              {product.sku || "--"}
                            </td>
                            <td className="px-3 py-2 align-middle text-slate-600">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="px-3 py-2 align-middle text-slate-600">
                              {product.status || "--"}
                            </td>
                            <td className="px-3 py-2 align-middle text-center">
                              <button
                                type="button"
                                onClick={() => setViewProduct(product)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                                aria-label="View product details"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "orders" && (
              <section className="space-y-4">
                {!ordersLoading && orders.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {orderSummaryCards.map(
                      ({ key, label, value, accent, badge }) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {label}
                          </p>
                          <div className="mt-3 flex items-baseline gap-3">
                            <span
                              className={`text-3xl font-semibold ${accent}`}
                            >
                              {value}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${badge}`}
                            >
                              {key.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}

                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Orders
                    </h2>
                    {!ordersLoading && (
                      <p className="text-xs text-slate-500">
                        Showing {filteredOrders.length} of {orders.length}{" "}
                        orders
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-slate-400" />
                      <select
                        value={ordersStatusFilter}
                        onChange={(event) =>
                          setOrdersStatusFilter(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {ORDER_STATUS_OPTIONS.map((value) => (
                          <option key={value || "all"} value={value}>
                            {value ? value.replace(/_/g, " ") : "All statuses"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={ordersSearch}
                        onChange={(event) =>
                          setOrdersSearch(event.target.value)
                        }
                        placeholder="Search by order id, buyer, email or tracking"
                        className="w-64 rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
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
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                            className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white text-left shadow-xl"
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
                  </div>
                </header>

                {ordersError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {ordersError}
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600 w-12">
                          <input
                            ref={selectAllCheckboxRef}
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-blue-500"
                            checked={
                              filteredOrders.length > 0 &&
                              filteredSelectedCount === filteredOrders.length
                            }
                            onChange={handleToggleSelectAll}
                            aria-label="Select all visible orders"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-12">
                          S/N
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Order ID
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Size
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Mobile
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">
                          QR
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Total
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Fulfilment
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Shipping
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">
                          Invoice
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {ordersLoading ? (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            Loading orders...
                          </td>
                        </tr>
                      ) : filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No orders found for this seller.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order, index) => {
                          const orderKey = getOrderKey(order);
                          const paymentStatus =
                            order.paymentStatus ||
                            order.payment?.status ||
                            "pending";
                          const firstItem =
                            Array.isArray(order.items) && order.items.length
                              ? order.items[0]
                              : null;
                          const sizeLabel =
                            firstItem?.size || firstItem?.selectedSize || "--";
                          const totalAmount = resolveOrderTotal(order);
                          const courier = order.shipping?.courier || "Triupati";
                          const trackingId = order.shipping?.trackingId || "";
                          const qrfolioImage =
                            order.qrfolio?.imageUrl ||
                            order.qrfolio?.image ||
                            "";
                          const customerName = resolveCustomerName(order);
                          const customerPhone = resolveCustomerPhone(order);
                          const customerEmail = resolveCustomerEmail(order);
                          const orderKeyString = String(orderKey || "");
                          const isSelected = Boolean(
                            orderKeyString &&
                            selectedOrderIdSet.has(orderKeyString),
                          );
                          const isDownloading =
                            downloadingInvoiceId === orderKeyString;

                          return (
                            <tr key={order._id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 align-middle text-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-blue-500"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleRowSelection(orderKeyString)
                                  }
                                  aria-label={`Select order ${orderKeyString}`}
                                />
                              </td>
                              <td className="px-3 py-2 align-middle text-[11px] font-semibold text-slate-500">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 align-middle font-mono text-[11px] text-slate-800">
                                {orderKey}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {sizeLabel}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                <div className="flex flex-col">
                                  <span>{customerName}</span>
                                  {customerEmail && customerEmail !== "--" && (
                                    <span className="text-[11px] text-slate-500">
                                      {customerEmail}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {customerPhone || "--"}
                              </td>
                              <td className="px-3 py-2 align-middle text-center">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!orderKeyString) {
                                      toast.error(
                                        "Order reference unavailable",
                                      );
                                      return;
                                    }
                                    if (!qrfolioImage) {
                                      toast.error(
                                        "QR code not available for this order yet.",
                                      );
                                      return;
                                    }
                                    try {
                                      setDownloadingQrId(orderKeyString);
                                      await downloadQrAsPdf({
                                        qrUrl: qrfolioImage,
                                        orderId: orderKey || orderKeyString,
                                        filePrefix: "order-qr",
                                        title: customerName || "Customer",
                                      });
                                      toast.success("QR code saved as PDF");
                                    } catch (qrError) {
                                      toast.error(
                                        qrError?.message ||
                                          "Failed to download QR code",
                                      );
                                    } finally {
                                      setDownloadingQrId(null);
                                    }
                                  }}
                                  disabled={
                                    !qrfolioImage ||
                                    downloadingQrId === orderKeyString
                                  }
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label={`Download QR for order ${orderKey}`}
                                >
                                  {downloadingQrId === orderKeyString ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <QrCode size={14} />
                                  )}
                                </button>
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-800">
                                {formatCurrency(totalAmount)}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                <div className="space-y-1">
                                  <span className="font-medium text-slate-800">
                                    {order.orderStatus ||
                                      order.status ||
                                      "processing"}
                                  </span>
                                  <span className="block text-[11px] text-slate-500">
                                    Payment: {paymentStatus}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                <div className="space-y-1">
                                  <span>{courier}</span>
                                  <span className="block text-[11px] text-slate-500 break-all">
                                    {trackingId || "--"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 align-middle text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadInvoice(order)}
                                  disabled={isDownloading}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDownloading ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Download size={12} />
                                  )}
                                  Invoice
                                </button>
                              </td>
                              <td className="px-3 py-2 align-middle text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/subadmin/sellers/${sellerId}/orders/${orderKey}`,
                                        {
                                          state: {
                                            returnTo: `/subadmin/sellers/${sellerId}`,
                                            returnState: {
                                              initialTab: "orders",
                                            },
                                            returnLabel:
                                              "Back to seller orders",
                                            allowReplacementActions: false,
                                          },
                                        },
                                      )
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                                    aria-label="View order"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditShipping(order)
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                                    aria-label="Edit courier & tracking"
                                  >
                                    <PencilLine size={14} />
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
              </section>
            )}

            {activeTab === "coupons" && (
              <section className="space-y-4">
                <header className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Coupons
                    </h2>
                    {!couponsLoading && (
                      <p className="text-xs text-slate-500">
                        Showing {filteredCoupons.length} of {coupons.length}{" "}
                        coupons
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-slate-400" />
                      <select
                        value={couponStatusFilter}
                        onChange={(event) =>
                          setCouponStatusFilter(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        {COUPON_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={couponSearch}
                        onChange={(event) =>
                          setCouponSearch(event.target.value)
                        }
                        placeholder="Search by code, description or discount"
                        className="w-64 rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </header>
                {!couponsLoading && filteredCoupons.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {couponCards.map(
                      ({ key, label, value, icon: Icon, iconBg, helper }) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {label}
                            </p>
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${iconBg}`}
                            >
                              <Icon size={16} />
                            </span>
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-slate-900">
                            {value}
                          </p>
                          {helper && (
                            <p className="text-[11px] font-medium text-slate-500">
                              {helper}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
                {couponsError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {couponsError}
                  </div>
                )}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-16">
                          S/N
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Code
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Description
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Discount
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Usage
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Validity
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Active
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {couponsLoading ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            Loading coupons...
                          </td>
                        </tr>
                      ) : filteredCoupons.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No coupons found for this seller.
                          </td>
                        </tr>
                      ) : (
                        filteredCoupons
                          .slice()
                          .sort((a, b) => {
                            const aDate = a?.createdAt
                              ? new Date(a.createdAt).getTime()
                              : 0;
                            const bDate = b?.createdAt
                              ? new Date(b.createdAt).getTime()
                              : 0;
                            return bDate - aDate;
                          })
                          .map((coupon, index) => {
                            const maxRedemptions =
                              Number(coupon.maxRedemptions) || 0;
                            const usageCount = Number(coupon.usageCount) || 0;
                            const isSingleUse = maxRedemptions <= 1;
                            const startDate = coupon.startDate
                              ? new Date(coupon.startDate)
                              : null;
                            const endDate = coupon.endDate
                              ? new Date(coupon.endDate)
                              : null;
                            const formatDate = (date) =>
                              date && !Number.isNaN(date.getTime())
                                ? date.toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "--";
                            const now = new Date();
                            const isExpired = endDate && endDate < now;
                            const statusLabel =
                              usageCount > 0 ? "Redeemed" : "Not redeemed";

                            return (
                              <tr
                                key={coupon._id}
                                className="hover:bg-slate-50"
                              >
                                <td className="px-3 py-2 align-middle text-xs font-semibold text-slate-500">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-2 align-middle font-mono text-xs text-slate-800">
                                  {coupon.code}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  {coupon.description || "--"}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  {coupon.discountType === "flat"
                                    ? `₹${coupon.discountValue}`
                                    : `${coupon.discountValue}%`}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  {isSingleUse ? "Single" : "Multi"}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  {`${usageCount} / ${
                                    maxRedemptions > 0 ? maxRedemptions : "∞"
                                  }`}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  {`${formatDate(startDate)} - ${formatDate(endDate)}`}
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                                      statusLabel === "Redeemed"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : isExpired
                                          ? "bg-slate-100 text-slate-500"
                                          : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2 align-middle text-slate-700">
                                  {coupon.isActive !== false ? "Yes" : "No"}
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {viewProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setViewProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex w-full max-w-5xl max-h-[90vh] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setViewProduct(null)}
                className="absolute right-4 top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="group relative flex-1 min-h-0">
                <div
                  className="modal-scroll h-full min-h-0 overflow-y-scroll px-6 pb-6 pt-20 md:px-8 md:pb-8 md:pt-24 relative"
                  style={{
                    maxHeight: "calc(90vh - 96px)",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#94a3b8 #e2e8f0",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pr-4 text-sm text-slate-700">
                    <section className="space-y-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="relative flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          {primaryImage ? (
                            <img
                              src={primaryImage}
                              alt={viewProduct.name || "Product image"}
                              className="h-auto max-h-96 w-full rounded-2xl object-contain p-4"
                            />
                          ) : (
                            <div className="flex h-64 w-full items-center justify-center text-slate-400">
                              <ImageOff size={28} />
                            </div>
                          )}
                        </div>

                        {secondaryImages.length > 0 && (
                          <div className="flex w-full flex-1 flex-wrap items-start justify-center gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 lg:max-w-xs">
                            {secondaryImages.slice(0, 8).map((url) => (
                              <img
                                key={url}
                                src={url}
                                alt="Product gallery thumbnail"
                                className="h-20 w-20 rounded-xl border border-slate-200 object-cover transition hover:scale-[1.02]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="space-y-5">
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Product Overview
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-semibold text-slate-900">
                            {viewProduct.name || "Untitled Product"}
                          </h2>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                            {viewProduct.status
                              ? viewProduct.status
                              : "Status unavailable"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>
                            ID:{" "}
                            <span className="font-mono">{viewProduct._id}</span>
                          </span>
                          {viewProduct.createdAt && (
                            <span>
                              Added:{" "}
                              {new Date(
                                viewProduct.createdAt,
                              ).toLocaleDateString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            SKU
                          </p>
                          <p className="mt-1 font-mono text-sm text-slate-800">
                            {viewProduct.sku || "--"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Category
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {viewProduct.category || "--"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Brand
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {viewProduct.brand || "--"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Price
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {formatCurrency(viewProduct.price)}
                          </p>
                          {viewProduct.originalPrice ? (
                            <p className="text-xs text-slate-500">
                              Original:{" "}
                              {formatCurrency(viewProduct.originalPrice)}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Discount
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {viewProduct.discountPercentage !== undefined &&
                            viewProduct.discountPercentage !== null
                              ? `${viewProduct.discountPercentage}%`
                              : viewProduct.saveAmount
                                ? `${formatCurrency(viewProduct.saveAmount)} off`
                                : "--"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Stock
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {Number.isFinite(Number(viewProduct.stock))
                              ? Number(viewProduct.stock)
                              : "--"}
                          </p>
                          {viewProduct.lowStockThreshold ? (
                            <p className="text-xs text-slate-500">
                              Low stock alert at {viewProduct.lowStockThreshold}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {viewProduct.description && (
                        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Description
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                            {viewProduct.description}
                          </p>
                        </div>
                      )}

                      {Array.isArray(viewProduct.keyFeatures) &&
                        viewProduct.keyFeatures.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Key Features
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                              {viewProduct.keyFeatures
                                .filter((feature) => Boolean(feature))
                                .map((feature) => (
                                  <li key={feature}>{feature}</li>
                                ))}
                            </ul>
                          </div>
                        )}

                      {Array.isArray(viewProduct.sizes) &&
                        viewProduct.sizes.length > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Sizes
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {viewProduct.sizes.map((size, index) => (
                                <span
                                  key={`${size?.label || "size"}-${index}`}
                                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                                    size?.isAvailable !== false
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                      : "border-slate-200 bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {size?.label || "--"}
                                  <span className="font-mono text-[11px]">
                                    {Number.isFinite(Number(size?.stock))
                                      ? Number(size.stock)
                                      : 0}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </section>

                    <div className="flex justify-end pb-2">
                      <button
                        type="button"
                        onClick={() => setViewProduct(null)}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-8 bottom-0 h-14 bg-gradient-to-t from-white via-white/90 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-5" />
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center text-xs font-medium text-slate-400 opacity-80 transition-opacity duration-300 group-hover:opacity-5">
                  Scroll to see full details
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={handleCloseEdit}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleCloseEdit}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                aria-label="Close"
                disabled={isSavingEdit}
              >
                <X size={16} />
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Order
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Update order status, payment details and courier information.
              </p>
              <form
                onSubmit={handleSaveShipping}
                className="mt-4 space-y-4 text-sm"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700">
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
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="returned">Returned</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>

                  {String(editForm.status || "").toLowerCase() ===
                    "rejected" && (
                    <label className="mt-2 flex items-center gap-2 text-xs font-medium text-rose-600">
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
                    <p className="mt-1 text-xs text-rose-500">
                      Unlock the toggle above to change the order status.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
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
                      <p className="mt-1 text-[11px] text-slate-500">
                        Payment is already marked successful and cannot be
                        changed.
                      </p>
                    ) : null}
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
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

                <label className="block text-xs font-medium text-slate-700">
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
                      Delivery date is locked because the order has already been
                      delivered or returned.
                    </p>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Courier
                    <select
                      value={editForm.courier}
                      onChange={(event) =>
                        handleEditFieldChange("courier", event.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {COURIER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-700">
                    Tracking ID
                    <input
                      type="text"
                      value={editForm.trackingId}
                      onChange={(event) =>
                        handleEditFieldChange("trackingId", event.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="To be assigned"
                    />
                  </label>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                  {requiresPaymentSuccess && !isPaymentSuccessful ? (
                    <p className="mr-auto text-xs text-rose-500">
                      Mark payment as successful before setting the order to
                      Delivered.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit || !canSaveEdit}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingEdit ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubadminSellerDetailsPage;
