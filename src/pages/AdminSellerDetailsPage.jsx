import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RefreshCw,
  Eye,
  PencilLine,
  Trash2,
  UserPlus,
  Package,
  ShoppingBag,
  TicketPercent,
  Filter,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  UploadCloud,
  X,
  Download,
} from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchAdminSellers,
  fetchAdminSellerProducts,
  fetchAdminSellerProductById,
  fetchAdminSellerOrders,
  fetchAdminSellerCoupons,
  updateAdminSellerProduct,
  updateAdminSellerOrder,
  updateAdminSellerCoupon,
  deleteAdminSellerProduct,
  deleteAdminSellerOrder,
  deleteAdminSellerCoupon,
} from "../services/adminSellersApi";
import { updateAdminUser, deleteAdminUser } from "../services/adminUsersApi";
import api from "../utils/api";
import toast from "react-hot-toast";

const STATUS_LABELS = {
  published: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-600",
  },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-500" },
};

const defaultProductViewModalState = {
  isOpen: false,
  loading: false,
  data: null,
  error: null,
};

const defaultProductEditModalState = {
  isOpen: false,
  loading: false,
  data: null,
  draft: null,
  error: null,
  isSubmitting: false,
};

const AVAILABILITY_BADGE_CLASSES = {
  in_stock: "bg-emerald-100 text-emerald-600",
  low_stock: "bg-amber-100 text-amber-600",
  out_of_stock: "bg-rose-100 text-rose-600",
  preorder: "bg-blue-100 text-blue-600",
};

const AVAILABILITY_LABELS = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
};

const getAvailabilityLabel = (status) =>
  AVAILABILITY_LABELS[status] || AVAILABILITY_LABELS.in_stock;

const normalizePriceFields = (product = {}) => {
  const priceValue = Number(product.price ?? 0);
  const originalValue = Number(
    product.originalPrice ?? product.price ?? product.costPrice ?? priceValue,
  );

  const price =
    Number.isFinite(priceValue) && priceValue > 0 ? priceValue : originalValue;
  const originalPrice =
    Number.isFinite(originalValue) && originalValue > 0 ? originalValue : price;

  const discountPercentage =
    product.discountPercentage !== undefined &&
    product.discountPercentage !== null
      ? Number(product.discountPercentage)
      : originalPrice > price && originalPrice > 0
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

  const saveAmount =
    product.saveAmount !== undefined && product.saveAmount !== null
      ? Number(product.saveAmount)
      : discountPercentage > 0
        ? originalPrice - price
        : 0;

  return {
    price,
    originalPrice,
    discountPercentage,
    saveAmount,
  };
};

const PRODUCT_TAX_PRESETS = [
  { matcher: /keychain/i, hsnCode: "8305", gstRate: 18 },
  {
    matcher: /ceramic\s+coffee\s+mug|coffee\s+mug|mug/i,
    hsnCode: "6912",
    gstRate: 12,
  },
  { matcher: /executive\s+diary|pen\s+set/i, hsnCode: "4820", gstRate: 18 },
  { matcher: /white\s+logo\s+cap|cap/i, hsnCode: "6501", gstRate: 18 },
  { matcher: /diary/i, hsnCode: "4820", gstRate: 18 },
  { matcher: /\bpen\b/i, hsnCode: "9608", gstRate: 18 },
  { matcher: /t\s*-?shirt|polo/i, hsnCode: "6109", gstRate: 5 },
];

const resolveTaxPreset = (name = "") => {
  const normalized = name.toString().trim();
  if (!normalized) {
    return null;
  }

  return (
    PRODUCT_TAX_PRESETS.find((preset) => preset.matcher.test(normalized)) ||
    null
  );
};

const LOCKED_AVAILABILITY_STATUSES = ["out_of_stock", "preorder"];

const computeSizeStockTotal = (sizes = []) =>
  sizes.reduce((total, entry) => {
    if (!entry || entry.isAvailable === false) {
      return total;
    }
    const numeric = Number(entry.stock ?? 0);
    if (!Number.isFinite(numeric)) {
      return total;
    }
    return total + Math.max(numeric, 0);
  }, 0);

const STANDARD_SIZE_LABELS = ["XS", "S", "M", "L", "XL", "XXL"];

const buildDefaultSizes = () =>
  STANDARD_SIZE_LABELS.map((label) => ({
    label,
    isAvailable: true,
    stock: 0,
  }));

const normalizeCategoryPriority = (value = "") => {
  const raw = value?.toString().trim().toUpperCase();
  if (!raw) {
    return "";
  }

  if (/^P\d{1,2}$/.test(raw)) {
    return raw;
  }

  const numeric = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return `P${numeric}`;
  }

  return "";
};

const AVAILABILITY_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "preorder", label: "Pre-order" },
];

const STATUS_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const normalizeSellerProduct = (product = {}) => {
  if (!product) {
    return null;
  }

  const base = { ...product };

  const metadata =
    base.metadata instanceof Map
      ? Object.fromEntries(base.metadata)
      : typeof base.metadata === "object" && base.metadata !== null
        ? { ...base.metadata }
        : {};

  const gallerySource = Array.isArray(base.gallery)
    ? base.gallery
    : Array.isArray(base.images)
      ? base.images
      : [];

  const gallery = gallerySource
    .map((entry) => (entry != null ? String(entry).trim() : ""))
    .filter((entry) => entry.length);

  const keyFeatures = Array.isArray(base.keyFeatures)
    ? base.keyFeatures
        .map((feature) => (feature != null ? String(feature).trim() : ""))
        .filter((feature) => feature.length)
    : [];

  const sizes = Array.isArray(base.sizes)
    ? base.sizes
        .map((size) => ({
          label: size?.label != null ? String(size.label).trim() : "",
          isAvailable: size?.isAvailable !== false,
          stock: Number.isFinite(Number(size?.stock)) ? Number(size.stock) : 0,
        }))
        .filter((size) => size.label || size.stock > 0)
    : [];

  const variants = Array.isArray(base.variants)
    ? base.variants.map((variant) => ({
        name: variant?.name,
        sku: variant?.sku,
        price: variant?.price,
        stock: variant?.stock,
        imageUrl: variant?.imageUrl,
        attributes: variant?.attributes,
        isActive: variant?.isActive !== false,
      }))
    : [];

  const { price, originalPrice, discountPercentage, saveAmount } =
    normalizePriceFields(base);

  return {
    ...base,
    price,
    originalPrice,
    discountPercentage,
    saveAmount,
    sku: base.sku || base.id || base._id || "",
    category: base.category || "",
    brand: base.brand || "",
    categoryPriority: base.categoryPriority || "",
    description: base.description || "",
    shortDescription: base.shortDescription || "",
    thumbnail: base.thumbnail || "",
    gallery,
    images: Array.isArray(base.images)
      ? base.images
          .map((image) => (image != null ? String(image).trim() : ""))
          .filter((image) => image.length)
      : gallery,
    keyFeatures,
    sizes,
    variants,
    metadata,
    stock: Number.isFinite(Number(base.stock)) ? Number(base.stock) : 0,
    lowStockThreshold: Number.isFinite(Number(base.lowStockThreshold))
      ? Number(base.lowStockThreshold)
      : 0,
    costPrice: Number.isFinite(Number(base.costPrice))
      ? Number(base.costPrice)
      : undefined,
    availabilityStatus: base.availabilityStatus || "in_stock",
    status: base.status || "published",
    isFeatured: Boolean(base.isFeatured),
    showSizes: Boolean(base.showSizes),
    hsnCode: base.hsnCode != null ? String(base.hsnCode).trim() : "",
    gstRate:
      base.gstRate !== undefined && base.gstRate !== null && base.gstRate !== ""
        ? String(base.gstRate)
        : "",
  };
};

const buildProductDraft = (product = {}) => {
  const normalized = normalizeSellerProduct(product) || {};
  const normalizedSizesList = normalized.showSizes
    ? Array.isArray(normalized.sizes) && normalized.sizes.length
      ? normalized.sizes
      : buildDefaultSizes()
    : Array.isArray(normalized.sizes)
      ? normalized.sizes
      : [];

  return {
    name: normalized.name || "",
    sku: normalized.sku || "",
    category: normalized.category || "",
    brand: normalized.brand || "",
    categoryPriority: normalized.categoryPriority || "",
    price:
      normalized.price !== undefined && normalized.price !== null
        ? String(normalized.price)
        : "",
    originalPrice:
      normalized.originalPrice !== undefined &&
      normalized.originalPrice !== null
        ? String(normalized.originalPrice)
        : "",
    discountPercentage:
      normalized.discountPercentage !== undefined &&
      normalized.discountPercentage !== null
        ? String(normalized.discountPercentage)
        : "",
    saveAmount:
      normalized.saveAmount !== undefined && normalized.saveAmount !== null
        ? String(normalized.saveAmount)
        : "",
    costPrice:
      normalized.costPrice !== undefined && normalized.costPrice !== null
        ? String(normalized.costPrice)
        : "",
    stock:
      normalized.stock !== undefined && normalized.stock !== null
        ? String(normalized.stock)
        : "0",
    lowStockThreshold:
      normalized.lowStockThreshold !== undefined &&
      normalized.lowStockThreshold !== null
        ? String(normalized.lowStockThreshold)
        : "",
    availabilityStatus: normalized.availabilityStatus || "in_stock",
    status: normalized.status || "published",
    isFeatured: Boolean(normalized.isFeatured),
    showSizes: Boolean(normalized.showSizes),
    description: normalized.description || "",
    shortDescription: normalized.shortDescription || "",
    hsnCode: normalized.hsnCode || "",
    gstRate:
      normalized.gstRate !== undefined && normalized.gstRate !== null
        ? String(normalized.gstRate)
        : "",
    keyFeatures:
      normalized.keyFeatures && normalized.keyFeatures.length
        ? [...normalized.keyFeatures]
        : [""],
    gallery:
      normalized.gallery && normalized.gallery.length
        ? [...normalized.gallery]
        : [],
    images:
      normalized.images && normalized.images.length
        ? [...normalized.images]
        : [],
    thumbnail: normalized.thumbnail || "",
    sizes: normalizedSizesList.map((size) => ({
      label: size?.label || "",
      isAvailable: size?.isAvailable !== false,
      stock:
        size?.stock !== undefined && size?.stock !== null
          ? String(size.stock)
          : "0",
    })),
    metadata:
      normalized.metadata && typeof normalized.metadata === "object"
        ? { ...normalized.metadata }
        : {},
    variants: normalized.variants || [],
  };
};

const ORDER_STATUS_OPTIONS = [
  "processing",
  "confirmed",
  "picked_up",
  "shipped",
  "out_for_delivery",
  "delivered",
  "returned",
];

const PAYMENT_STATUS_OPTIONS = ["pending", "paid", "failed"];

const formatCurrency = (value) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
};

const formatDate = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
};

const confirmDeletion = ({ entity = "item", name } = {}) => {
  if (typeof window === "undefined") return true;
  const entityLabel = entity.toLowerCase();
  const nameLabel = name ? ` "${name}"` : "";
  return window.confirm(
    `Are you sure you want to delete this ${entityLabel}${nameLabel}? This action cannot be undone.`,
  );
};

const BaseModal = ({ isOpen, title, onClose, children, footer }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        key="modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          <div className="flex items-start justify-between gap-4 pr-12">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1 text-sm text-slate-600">
            {children}
          </div>
          {footer ? (
            <div className="mt-6 flex justify-end gap-3">{footer}</div>
          ) : null}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
    <div className="rounded-full bg-blue-50 p-4 text-blue-600">
      <Icon size={24} />
    </div>
    <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

EmptyState.defaultProps = {
  subtitle: "",
};

const AdminSellerDetailsPage = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [sellers, setSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  const [sellersRefreshing, setSellersRefreshing] = useState(false);
  const [sellersError, setSellersError] = useState("");
  const [sellerSearch, setSellerSearch] = useState("");

  const [selectedSellerId, setSelectedSellerId] = useState("all");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsRefreshing, setProductsRefreshing] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productViewModal, setProductViewModal] = useState(
    defaultProductViewModalState,
  );
  const [productEditModal, setProductEditModal] = useState(
    defaultProductEditModalState,
  );
  const [productMediaUploading, setProductMediaUploading] = useState({
    thumbnail: false,
    gallery: false,
  });
  const [productEditAuto, setProductEditAuto] = useState({
    hasManualHsn: false,
    hasManualGst: false,
  });
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const thumbnailInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const ordersHeaderCheckboxRef = useRef(null);
  const couponsHeaderCheckboxRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderSelection, setOrderSelection] = useState(() => new Set());
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersRowsPerPage, setOrdersRowsPerPage] = useState(10);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [orderEdit, setOrderEdit] = useState(null);
  const [orderView, setOrderView] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderSellerNameFilter, setOrderSellerNameFilter] = useState("");
  const [orderMinAmountFilter, setOrderMinAmountFilter] = useState("");
  const [orderMaxAmountFilter, setOrderMaxAmountFilter] = useState("");
  const [orderStatusDraft, setOrderStatusDraft] = useState("");
  const [orderSellerNameDraft, setOrderSellerNameDraft] = useState("");
  const [orderMinAmountDraft, setOrderMinAmountDraft] = useState("");
  const [orderMaxAmountDraft, setOrderMaxAmountDraft] = useState("");

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsRefreshing, setCouponsRefreshing] = useState(false);
  const [couponsError, setCouponsError] = useState("");
  const [couponSelection, setCouponSelection] = useState(() => new Set());
  const [couponsPage, setCouponsPage] = useState(1);
  const [couponsRowsPerPage, setCouponsRowsPerPage] = useState(10);
  const [couponEdit, setCouponEdit] = useState(null);
  const [couponView, setCouponView] = useState(null);

  const [sellerView, setSellerView] = useState(null);
  const [sellerEdit, setSellerEdit] = useState(null);
  const [isSavingSeller, setIsSavingSeller] = useState(false);
  const [isDeletingSeller, setIsDeletingSeller] = useState(false);

  const loadSellers = useCallback(async ({ silent } = { silent: false }) => {
    try {
      if (silent) {
        setSellersRefreshing(true);
      } else {
        setSellersLoading(true);
      }
      const data = await fetchAdminSellers();
      setSellers(Array.isArray(data) ? data : []);
      setSellersError("");
    } catch (error) {
      console.error("Failed to load sellers", error);
      setSellersError(error.message || "Unable to load sellers");
    } finally {
      setSellersLoading(false);
      setSellersRefreshing(false);
    }
  }, []);

  const loadProducts = useCallback(
    async ({ silent } = { silent: false }) => {
      try {
        if (silent) {
          setProductsRefreshing(true);
        } else {
          setProductsLoading(true);
        }
        const params =
          selectedSellerId !== "all" ? { sellerId: selectedSellerId } : {};
        const data = await fetchAdminSellerProducts(params);
        const normalizedProducts = Array.isArray(data)
          ? data.map((item) => normalizeSellerProduct(item) || item)
          : [];
        setProducts(normalizedProducts);
        setProductsError("");
      } catch (error) {
        console.error("Failed to load seller products", error);
        setProductsError(error.message || "Unable to load seller products");
      } finally {
        setProductsLoading(false);
        setProductsRefreshing(false);
      }
    },
    [selectedSellerId],
  );

  const loadOrders = useCallback(
    async ({ silent } = { silent: false }) => {
      try {
        if (silent) {
          setOrdersRefreshing(true);
        } else {
          setOrdersLoading(true);
        }
        const params = {};

        if (selectedSellerId !== "all") {
          params.sellerId = selectedSellerId;
        }

        if (orderStatusFilter) {
          params.status = orderStatusFilter;
        }

        if (orderSellerNameFilter) {
          params.sellerName = orderSellerNameFilter;
        }

        if (orderMinAmountFilter) {
          params.minAmount = orderMinAmountFilter;
        }

        if (orderMaxAmountFilter) {
          params.maxAmount = orderMaxAmountFilter;
        }

        const data = await fetchAdminSellerOrders(params);
        setOrders(Array.isArray(data) ? data : []);
        setOrdersError("");
      } catch (error) {
        console.error("Failed to load seller orders", error);
        setOrdersError(error.message || "Unable to load seller orders");
      } finally {
        setOrdersLoading(false);
        setOrdersRefreshing(false);
      }
    },
    [
      selectedSellerId,
      orderStatusFilter,
      orderSellerNameFilter,
      orderMinAmountFilter,
      orderMaxAmountFilter,
    ],
  );

  const loadCoupons = useCallback(
    async ({ silent } = { silent: false }) => {
      try {
        if (silent) {
          setCouponsRefreshing(true);
        } else {
          setCouponsLoading(true);
        }
        const params =
          selectedSellerId !== "all" ? { sellerId: selectedSellerId } : {};
        const data = await fetchAdminSellerCoupons(params);
        setCoupons(Array.isArray(data) ? data : []);
        setCouponsError("");
      } catch (error) {
        console.error("Failed to load seller coupons", error);
        setCouponsError(error.message || "Unable to load seller coupons");
      } finally {
        setCouponsLoading(false);
        setCouponsRefreshing(false);
      }
    },
    [selectedSellerId],
  );

  const sanitizeAmountInput = (value = "") => value.replace(/[^0-9.]/g, "");

  const handleOrderFiltersSubmit = useCallback(
    (event) => {
      event.preventDefault();

      const trimmedStatus = orderStatusDraft.trim();
      const trimmedSeller = orderSellerNameDraft.trim();
      const sanitizedMin = sanitizeAmountInput(orderMinAmountDraft);
      const sanitizedMax = sanitizeAmountInput(orderMaxAmountDraft);

      setOrderStatusDraft(trimmedStatus);
      setOrderSellerNameDraft(trimmedSeller);
      setOrderMinAmountDraft(sanitizedMin);
      setOrderMaxAmountDraft(sanitizedMax);

      setOrderStatusFilter(trimmedStatus);
      setOrderSellerNameFilter(trimmedSeller);
      setOrderMinAmountFilter(sanitizedMin);
      setOrderMaxAmountFilter(sanitizedMax);
    },
    [
      orderStatusDraft,
      orderSellerNameDraft,
      orderMinAmountDraft,
      orderMaxAmountDraft,
    ],
  );

  const handleOrderFiltersReset = useCallback(() => {
    setOrderStatusDraft("");
    setOrderSellerNameDraft("");
    setOrderMinAmountDraft("");
    setOrderMaxAmountDraft("");

    setOrderStatusFilter("");
    setOrderSellerNameFilter("");
    setOrderMinAmountFilter("");
    setOrderMaxAmountFilter("");
  }, []);

  const ordersPagination = useMemo(() => {
    const rows = Math.max(ordersRowsPerPage, 1);
    const total = orders.length;
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / rows));
    const currentPage = Math.min(Math.max(ordersPage, 1), totalPages);
    const startIndex = (currentPage - 1) * rows;
    const endIndex = Math.min(startIndex + rows, total);
    const items = orders.slice(startIndex, endIndex);
    return {
      total,
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      items,
    };
  }, [orders, ordersPage, ordersRowsPerPage]);

  const paginatedOrders = ordersPagination.items;

  const couponsPagination = useMemo(() => {
    const rows = Math.max(couponsRowsPerPage, 1);
    const total = coupons.length;
    const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / rows));
    const currentPage = Math.min(Math.max(couponsPage, 1), totalPages);
    const startIndex = (currentPage - 1) * rows;
    const endIndex = Math.min(startIndex + rows, total);
    const items = coupons.slice(startIndex, endIndex);
    return {
      total,
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      items,
    };
  }, [coupons, couponsPage, couponsRowsPerPage]);

  const paginatedCoupons = couponsPagination.items;

  const ordersPageIds = useMemo(
    () => paginatedOrders.map((order) => String(order._id)),
    [paginatedOrders],
  );
  const couponsPageIds = useMemo(
    () => paginatedCoupons.map((coupon) => String(coupon._id)),
    [paginatedCoupons],
  );

  const areAllOrdersSelected =
    ordersPageIds.length > 0 &&
    ordersPageIds.every((id) => orderSelection.has(id));
  const areSomeOrdersSelected = ordersPageIds.some((id) =>
    orderSelection.has(id),
  );

  const areAllCouponsSelected =
    couponsPageIds.length > 0 &&
    couponsPageIds.every((id) => couponSelection.has(id));
  const areSomeCouponsSelected = couponsPageIds.some((id) =>
    couponSelection.has(id),
  );

  const handleToggleOrderSelection = useCallback((orderId) => {
    const id = String(orderId ?? "");
    if (!id) return;
    setOrderSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAllOrders = useCallback(() => {
    if (!ordersPageIds.length) return;
    setOrderSelection((prev) => {
      const next = new Set(prev);
      const allSelected = ordersPageIds.every((id) => next.has(id));
      if (allSelected) {
        ordersPageIds.forEach((id) => next.delete(id));
      } else {
        ordersPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [ordersPageIds]);

  const handleOrdersRowsPerPageChange = useCallback((event) => {
    setOrdersRowsPerPage(Number(event.target.value) || 10);
    setOrdersPage(1);
  }, []);

  const handleOrdersPageChange = useCallback(
    (nextPage) => {
      const clamped = Math.min(
        Math.max(nextPage, 1),
        ordersPagination.totalPages || 1,
      );
      setOrdersPage(clamped);
    },
    [ordersPagination.totalPages],
  );

  const handleToggleCouponSelection = useCallback((couponId) => {
    const id = String(couponId ?? "");
    if (!id) return;
    setCouponSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAllCoupons = useCallback(() => {
    if (!couponsPageIds.length) return;
    setCouponSelection((prev) => {
      const next = new Set(prev);
      const allSelected = couponsPageIds.every((id) => next.has(id));
      if (allSelected) {
        couponsPageIds.forEach((id) => next.delete(id));
      } else {
        couponsPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [couponsPageIds]);

  const handleCouponsRowsPerPageChange = useCallback((event) => {
    setCouponsRowsPerPage(Number(event.target.value) || 10);
    setCouponsPage(1);
  }, []);

  const handleCouponsPageChange = useCallback(
    (nextPage) => {
      const clamped = Math.min(
        Math.max(nextPage, 1),
        couponsPagination.totalPages || 1,
      );
      setCouponsPage(clamped);
    },
    [couponsPagination.totalPages],
  );

  const handleBulkDeleteOrders = useCallback(async () => {
    if (!orderSelection.size) {
      toast.error("Select at least one order");
      return;
    }
    const confirmed = confirmDeletion({
      entity: "seller orders",
      name: `${orderSelection.size} selected`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        Array.from(orderSelection).map((orderId) =>
          deleteAdminSellerOrder(orderId),
        ),
      );
      toast.success("Selected orders removed");
      setOrderSelection(new Set());
      await loadOrders({ silent: true });
    } catch (error) {
      console.error("Failed to bulk delete seller orders", error);
      toast.error(error.message || "Unable to delete selected orders");
    }
  }, [orderSelection, loadOrders]);

  const handleBulkDeleteCoupons = useCallback(async () => {
    if (!couponSelection.size) {
      toast.error("Select at least one coupon");
      return;
    }
    const confirmed = confirmDeletion({
      entity: "coupons",
      name: `${couponSelection.size} selected`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        Array.from(couponSelection).map((couponId) =>
          deleteAdminSellerCoupon(couponId),
        ),
      );
      toast.success("Selected coupons removed");
      setCouponSelection(new Set());
      await loadCoupons({ silent: true });
    } catch (error) {
      console.error("Failed to bulk delete seller coupons", error);
      toast.error(error.message || "Unable to delete selected coupons");
    }
  }, [couponSelection, loadCoupons]);

  const serializeOrdersForExport = useCallback(
    (sourceOrders) => {
      const dataset = Array.isArray(sourceOrders) ? sourceOrders : orders;
      return dataset.map((order) => ({
        orderId: order.orderId || order._id,
        seller:
          order.sellerId?.name ||
          order.sellerId?.companyName ||
          order.sellerId?.username ||
          "Seller",
        customer:
          order.customerName ||
          order.buyerName ||
          order.shippingAddress?.fullName ||
          "Customer",
        customerEmail:
          order.customerEmail ||
          order.buyerEmail ||
          order.shippingAddress?.email ||
          "",
        revenue: order.totals?.revenue ?? 0,
        quantity: order.totals?.quantity ?? 0,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      }));
    },
    [orders],
  );

  const serializeCouponsForExport = useCallback(
    (sourceCoupons) => {
      const dataset = Array.isArray(sourceCoupons) ? sourceCoupons : coupons;
      return dataset.map((coupon) => ({
        code: coupon.code,
        seller: coupon.sellerId?.name || coupon.sellerId?.username || "Seller",
        discount:
          coupon.discountType === "percentage"
            ? `${coupon.discountValue}%`
            : coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount || 0,
        usage: `${coupon.usageCount || 0}/${coupon.maxRedemptions || "∞"}`,
        isActive: coupon.isActive ? "Yes" : "No",
        createdAt: coupon.createdAt,
      }));
    },
    [coupons],
  );

  const handleExportCsv = useCallback((rows, filenamePrefix) => {
    if (!rows.length) {
      toast.error("Nothing to export");
      return;
    }
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((key) => {
            const value = row[key] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, []);

  const handleExportOrders = useCallback(() => {
    const hasSelection = orderSelection.size > 0;
    const selectedOrders = hasSelection
      ? orders.filter((order) => orderSelection.has(String(order._id)))
      : undefined;
    const rows = serializeOrdersForExport(selectedOrders);
    if (!rows.length) {
      toast.error(
        hasSelection ? "No selected orders to export" : "Nothing to export",
      );
      return;
    }
    handleExportCsv(
      rows,
      hasSelection ? "seller-orders-selected" : "seller-orders",
    );
  }, [handleExportCsv, orderSelection, orders, serializeOrdersForExport]);

  const handleExportCoupons = useCallback(() => {
    const hasSelection = couponSelection.size > 0;
    const selectedCoupons = hasSelection
      ? coupons.filter((coupon) => couponSelection.has(String(coupon._id)))
      : undefined;
    const rows = serializeCouponsForExport(selectedCoupons);
    if (!rows.length) {
      toast.error(
        hasSelection ? "No selected coupons to export" : "Nothing to export",
      );
      return;
    }
    handleExportCsv(
      rows,
      hasSelection ? "seller-coupons-selected" : "seller-coupons",
    );
  }, [couponSelection, coupons, handleExportCsv, serializeCouponsForExport]);

  const handleDownloadInvoice = useCallback(async (order) => {
    const sellerOrderId = order?._id;
    const baseOrderIdRaw = order?.orderId || sellerOrderId;
    const baseOrderId = baseOrderIdRaw ? String(baseOrderIdRaw) : "";

    if (!baseOrderId) {
      toast.error("Order details unavailable");
      return;
    }

    try {
      if (sellerOrderId) {
        setDownloadingInvoiceId(String(sellerOrderId));
      }
      const response = await api.get(`/orders/${baseOrderId}/invoice`, {
        responseType: "blob",
        headers: { Accept: "application/pdf" },
      });

      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || `invoice-${baseOrderId}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (error) {
      console.error("Invoice download failed", error);
      const message =
        error?.response?.data?.message ||
        (error?.response?.status === 404
          ? "Invoice not found for this order. Try regenerating from the main order record."
          : error?.message) ||
        "Unable to download invoice";
      toast.error(message);
    } finally {
      setDownloadingInvoiceId(null);
    }
  }, []);

  const isOrderInvoiceAvailable = useCallback((order) => {
    const normalized = String(
      order?.paymentStatus || order?.payment?.status || "",
    ).toLowerCase();
    const hasInvoiceAsset = Boolean(
      order?.invoice?.url ||
      order?.invoiceUrl ||
      order?.invoice?.number ||
      order?.invoiceNumber,
    );
    return (
      hasInvoiceAsset ||
      ["paid", "success", "successful", "completed", "confirmed"].includes(
        normalized,
      )
    );
  }, []);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  useEffect(() => {
    loadProducts();
    loadCoupons();
  }, [loadProducts, loadCoupons]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const rows = Math.max(ordersRowsPerPage, 1);
    const totalPages = Math.max(
      1,
      Math.ceil(Math.max(orders.length, 1) / rows),
    );
    setOrdersPage((prev) => Math.min(Math.max(prev, 1), totalPages));
    setOrderSelection((prev) => {
      if (!prev.size) return prev;
      const availableIds = new Set(orders.map((order) => String(order._id)));
      const next = new Set(
        Array.from(prev).filter((id) => availableIds.has(String(id))),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [orders, ordersRowsPerPage]);

  useEffect(() => {
    const rows = Math.max(couponsRowsPerPage, 1);
    const totalPages = Math.max(
      1,
      Math.ceil(Math.max(coupons.length, 1) / rows),
    );
    setCouponsPage((prev) => Math.min(Math.max(prev, 1), totalPages));
    setCouponSelection((prev) => {
      if (!prev.size) return prev;
      const availableIds = new Set(coupons.map((coupon) => String(coupon._id)));
      const next = new Set(
        Array.from(prev).filter((id) => availableIds.has(String(id))),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [coupons, couponsRowsPerPage]);

  useEffect(() => {
    if (ordersHeaderCheckboxRef.current) {
      ordersHeaderCheckboxRef.current.indeterminate =
        areSomeOrdersSelected && !areAllOrdersSelected;
    }
  }, [areAllOrdersSelected, areSomeOrdersSelected]);

  useEffect(() => {
    if (couponsHeaderCheckboxRef.current) {
      couponsHeaderCheckboxRef.current.indeterminate =
        areSomeCouponsSelected && !areAllCouponsSelected;
    }
  }, [areAllCouponsSelected, areSomeCouponsSelected]);

  const filteredSellers = useMemo(() => {
    const query = sellerSearch.trim().toLowerCase();
    if (!query) return sellers;
    return sellers.filter((seller) =>
      [seller.name, seller.username, seller.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [sellers, sellerSearch]);

  const selectedSeller = useMemo(() => {
    if (selectedSellerId === "all") return null;
    return (
      sellers.find(
        (seller) => String(seller._id) === String(selectedSellerId),
      ) || null
    );
  }, [selectedSellerId, sellers]);

  const summaries = useMemo(() => {
    const totalSellers = sellers.length;
    const verifiedSellers = sellers.filter(
      (seller) => seller.isVerified,
    ).length;
    const totalProducts = sellers.reduce(
      (acc, seller) => acc + (seller.metrics?.products || 0),
      0,
    );
    const totalOrders = sellers.reduce(
      (acc, seller) => acc + (seller.metrics?.orders || 0),
      0,
    );
    const totalCoupons = sellers.reduce(
      (acc, seller) => acc + (seller.metrics?.coupons || 0),
      0,
    );

    return [
      {
        label: "Sellers",
        value: totalSellers,
        icon: UserPlus,
        accent: "text-blue-600",
      },
      {
        label: "Verified Sellers",
        value: verifiedSellers,
        icon: ShieldCheck,
        accent: "text-emerald-600",
      },
      {
        label: "Seller Products",
        value: totalProducts,
        icon: Package,
        accent: "text-indigo-600",
      },
      {
        label: "Seller Orders",
        value: totalOrders,
        icon: ShoppingBag,
        accent: "text-purple-600",
      },
      {
        label: "Seller Coupons",
        value: totalCoupons,
        icon: TicketPercent,
        accent: "text-rose-600",
      },
    ];
  }, [sellers]);

  const handleSellerUpdate = async (payload) => {
    if (!sellerEdit) return;
    setIsSavingSeller(true);
    try {
      const updates = {
        username: payload.username?.trim() || sellerEdit.username,
        role: payload.role || sellerEdit.role,
        isVerified: Boolean(payload.isVerified),
      };
      const updated = await updateAdminUser(sellerEdit._id, updates);
      toast.success("Seller updated");
      setSellers((prev) =>
        prev.map((seller) =>
          seller._id === updated._id
            ? { ...seller, ...updated, metrics: seller.metrics }
            : seller,
        ),
      );
      setSellerEdit(null);
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to update seller", error);
      toast.error(error.message || "Unable to update seller");
    } finally {
      setIsSavingSeller(false);
    }
  };

  const handleSellerDelete = async (targetSeller = sellerEdit) => {
    if (!targetSeller) return;
    const confirmed = confirmDeletion({
      entity: "seller",
      name:
        targetSeller.name ||
        targetSeller.username ||
        targetSeller.email ||
        targetSeller._id,
    });
    if (!confirmed) return;
    setIsDeletingSeller(true);
    try {
      await deleteAdminUser(targetSeller._id);
      toast.success("Seller removed");
      setSellers((prev) =>
        prev.filter((seller) => seller._id !== targetSeller._id),
      );
      if (selectedSellerId === String(targetSeller._id)) {
        setSelectedSellerId("all");
      }
      setSellerEdit(null);
      await loadSellers({ silent: true });
      await Promise.all([
        loadProducts({ silent: true }),
        loadOrders({ silent: true }),
        loadCoupons({ silent: true }),
      ]);
    } catch (error) {
      console.error("Failed to delete seller", error);
      toast.error(error.message || "Unable to delete seller");
    } finally {
      setIsDeletingSeller(false);
    }
  };

  const handleViewProduct = useCallback(
    async (productId) => {
      const cached = products.find(
        (item) => String(item._id) === String(productId),
      );

      setProductViewModal({
        isOpen: true,
        loading: !cached,
        data: cached ? normalizeSellerProduct(cached) : null,
        error: null,
      });

      try {
        const response = await fetchAdminSellerProductById(productId);
        const normalized = normalizeSellerProduct(response) || response;
        setProductViewModal({
          isOpen: true,
          loading: false,
          data: normalized,
          error: null,
        });
      } catch (error) {
        console.error("Failed to load product", error);
        const message = error?.message || "Failed to load product";
        if (cached) {
          toast.error(message);
          setProductViewModal((prev) => ({
            ...prev,
            loading: false,
            error: message,
          }));
        } else {
          setProductViewModal({
            isOpen: true,
            loading: false,
            data: null,
            error: message,
          });
          await loadProducts({ silent: true });
        }
      }
    },
    [products, loadProducts],
  );

  const handleOrderDelete = useCallback(
    async (sellerOrderId) => {
      const targetOrder = orders.find((item) => item._id === sellerOrderId);
      const confirmed = confirmDeletion({
        entity: "seller order",
        name: targetOrder?.orderId,
      });
      if (!confirmed) {
        return;
      }

      try {
        await deleteAdminSellerOrder(sellerOrderId);
        toast.success("Seller order removed");
        await loadOrders({ silent: true });
      } catch (error) {
        console.error("Failed to delete seller order", error);
        toast.error(error.message || "Unable to delete seller order");
      }
    },
    [orders, loadOrders],
  );

  const handleOrderUpdate = useCallback(
    async (orderId, updates = {}) => {
      if (!orderId) {
        return;
      }

      setIsSavingOrder(true);

      try {
        const payload = { ...updates };

        if (payload.estimatedDeliveryDate === "") {
          payload.estimatedDeliveryDate = null;
        }

        const updated = await updateAdminSellerOrder(orderId, payload);

        toast.success("Order updated");

        setOrders((prev) => {
          const identifier = String(updated?._id ?? orderId);
          return prev.map((order) =>
            String(order._id) === identifier
              ? {
                  ...order,
                  ...updated,
                  orderStatus:
                    updated?.orderStatus ??
                    payload.orderStatus ??
                    order.orderStatus,
                  paymentStatus:
                    updated?.paymentStatus ??
                    payload.paymentStatus ??
                    order.paymentStatus,
                  estimatedDeliveryDate:
                    updated?.estimatedDeliveryDate ??
                    payload.estimatedDeliveryDate ??
                    order.estimatedDeliveryDate,
                }
              : order,
          );
        });

        setOrderEdit(null);
        await loadOrders({ silent: true });
      } catch (error) {
        console.error("Failed to update seller order", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to update seller order";
        toast.error(message);
      } finally {
        setIsSavingOrder(false);
      }
    },
    [loadOrders],
  );

  const handleCloseViewProduct = useCallback(() => {
    setProductViewModal(defaultProductViewModalState);
  }, []);

  const updateProductDraft = useCallback((updater) => {
    setProductEditModal((prev) => {
      if (!prev.draft) {
        return prev;
      }

      const nextDraft = updater(prev.draft);
      return {
        ...prev,
        draft: nextDraft,
      };
    });
  }, []);

  const handleOpenEditProduct = useCallback(
    async (productId) => {
      const cached = products.find(
        (item) => String(item._id) === String(productId),
      );
      const normalizedCached = cached ? normalizeSellerProduct(cached) : null;

      setProductEditModal({
        isOpen: true,
        loading: !cached,
        data: normalizedCached,
        draft: normalizedCached ? buildProductDraft(normalizedCached) : null,
        error: null,
        isSubmitting: false,
      });
      setProductEditAuto({
        hasManualHsn: Boolean(normalizedCached?.hsnCode),
        hasManualGst:
          normalizedCached?.gstRate !== undefined &&
          normalizedCached?.gstRate !== null &&
          normalizedCached?.gstRate !== "",
      });
      setProductMediaUploading({ thumbnail: false, gallery: false });
      setNewGalleryUrl("");

      try {
        const response = await fetchAdminSellerProductById(productId);
        const normalized = normalizeSellerProduct(response) || response;
        const draft = buildProductDraft(normalized);

        setProductEditModal({
          isOpen: true,
          loading: false,
          data: normalized,
          draft,
          error: null,
          isSubmitting: false,
        });
        setProductEditAuto({
          hasManualHsn: Boolean(normalized?.hsnCode),
          hasManualGst:
            normalized?.gstRate !== undefined &&
            normalized?.gstRate !== null &&
            normalized?.gstRate !== "",
        });
        setProductMediaUploading({ thumbnail: false, gallery: false });
        setNewGalleryUrl("");
      } catch (error) {
        console.error("Failed to load product", error);
        const message = error?.message || "Failed to load product";
        if (cached) {
          toast.error(message);
          setProductEditModal((prev) => ({
            ...prev,
            loading: false,
            error: message,
          }));
        } else {
          setProductEditModal({
            isOpen: true,
            loading: false,
            data: null,
            draft: null,
            error: message,
            isSubmitting: false,
          });
          await loadProducts({ silent: true });
        }
      }
    },
    [products, loadProducts],
  );

  const handleCloseEditProduct = useCallback(() => {
    setProductEditModal(defaultProductEditModalState);
    setProductEditAuto({ hasManualHsn: false, hasManualGst: false });
    setProductMediaUploading({ thumbnail: false, gallery: false });
    setNewGalleryUrl("");
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }, []);

  const handleProductDelete = useCallback(
    async (productId) => {
      const product = products.find((item) => item._id === productId);
      const confirmed = confirmDeletion({
        entity: "product",
        name: product?.name,
      });
      if (!confirmed) {
        return;
      }

      try {
        await deleteAdminSellerProduct(productId);
        toast.success("Product removed");
        await loadProducts({ silent: true });
      } catch (error) {
        console.error("Failed to delete seller product", error);
        toast.error(error.message || "Unable to delete seller product");
      }
    },
    [products, loadProducts],
  );

  const handleChangeProductDraft = useCallback(
    (field, value) => {
      updateProductDraft((draft) => {
        const nextDraft = { ...draft };
        let nextValue = value;

        if (field === "categoryPriority") {
          nextValue = normalizeCategoryPriority(nextValue);
        }

        if (
          [
            "price",
            "originalPrice",
            "discountPercentage",
            "saveAmount",
            "stock",
            "lowStockThreshold",
            "costPrice",
            "gstRate",
          ].includes(field)
        ) {
          nextValue =
            nextValue === "" || nextValue === null
              ? ""
              : String(nextValue).replace(/[^0-9.]/g, "");
        }

        nextDraft[field] = nextValue;
        return nextDraft;
      });
    },
    [updateProductDraft],
  );

  const handleNameChange = useCallback(
    (value) => {
      handleChangeProductDraft("name", value);
      const preset = resolveTaxPreset(value);
      if (preset) {
        updateProductDraft((draft) => {
          const nextDraft = { ...draft };
          if (!productEditAuto.hasManualHsn || !nextDraft.hsnCode) {
            nextDraft.hsnCode = preset.hsnCode;
          }
          if (!productEditAuto.hasManualGst || !nextDraft.gstRate) {
            nextDraft.gstRate = String(preset.gstRate);
          }
          return nextDraft;
        });
      }
    },
    [
      handleChangeProductDraft,
      productEditAuto.hasManualGst,
      productEditAuto.hasManualHsn,
      updateProductDraft,
    ],
  );

  const handleTaxFieldChange = useCallback(
    (field, value) => {
      setProductEditAuto((prev) => ({
        ...prev,
        [field === "hsnCode" ? "hasManualHsn" : "hasManualGst"]: true,
      }));
      handleChangeProductDraft(field, value);
    },
    [handleChangeProductDraft],
  );

  const handleToggleProductDraft = useCallback(
    (field, checked) => {
      updateProductDraft((draft) => {
        const nextDraft = {
          ...draft,
          [field]: checked,
        };

        if (field === "showSizes") {
          const sizes = checked
            ? draft.sizes && draft.sizes.length
              ? draft.sizes
              : buildDefaultSizes().map((size) => ({
                  label: size.label,
                  isAvailable: true,
                  stock: "0",
                }))
            : draft.sizes || [];

          nextDraft.sizes = sizes;
          if (
            !LOCKED_AVAILABILITY_STATUSES.includes(draft.availabilityStatus)
          ) {
            const totalStock = computeSizeStockTotal(
              sizes.map((size) => ({
                ...size,
                stock: Number(size.stock ?? 0),
              })),
            );
            nextDraft.stock = checked ? String(totalStock) : draft.stock;
          } else {
            nextDraft.stock = "0";
          }
        }

        return nextDraft;
      });
    },
    [updateProductDraft],
  );

  const handleAvailabilityChange = useCallback(
    (value) => {
      updateProductDraft((draft) => {
        const nextDraft = {
          ...draft,
          availabilityStatus: value,
        };

        if (LOCKED_AVAILABILITY_STATUSES.includes(value)) {
          nextDraft.stock = "0";
        } else if (draft.showSizes) {
          const totalStock = computeSizeStockTotal(
            (draft.sizes || []).map((size) => ({
              ...size,
              stock: Number(size.stock ?? 0),
            })),
          );
          nextDraft.stock = String(totalStock);
        }

        return nextDraft;
      });
    },
    [updateProductDraft],
  );

  const handlePricingChange = useCallback(
    (field, value) => {
      updateProductDraft((draft) => {
        const nextDraft = { ...draft, [field]: value };

        const priceValue = parseFloat(field === "price" ? value : draft.price);
        const originalValue = parseFloat(
          field === "originalPrice" ? value : draft.originalPrice,
        );

        if (
          !Number.isNaN(priceValue) &&
          !Number.isNaN(originalValue) &&
          originalValue >= priceValue &&
          originalValue > 0
        ) {
          const save = originalValue - priceValue;
          nextDraft.discountPercentage = Math.round(
            (save / originalValue) * 100,
          ).toString();
          nextDraft.saveAmount = save.toFixed(2);
        } else {
          nextDraft.discountPercentage = "";
          nextDraft.saveAmount = "";
        }

        return nextDraft;
      });
    },
    [updateProductDraft],
  );

  const handleFeatureChange = useCallback(
    (index, value) => {
      updateProductDraft((draft) => {
        const features = Array.isArray(draft.keyFeatures)
          ? [...draft.keyFeatures]
          : [""];
        features[index] = value;
        return {
          ...draft,
          keyFeatures: features,
        };
      });
    },
    [updateProductDraft],
  );

  const handleAddFeature = useCallback(() => {
    updateProductDraft((draft) => ({
      ...draft,
      keyFeatures: [...(draft.keyFeatures || []), ""],
    }));
  }, [updateProductDraft]);

  const handleRemoveFeature = useCallback(
    (index) => {
      updateProductDraft((draft) => {
        const features = Array.isArray(draft.keyFeatures)
          ? draft.keyFeatures.filter((_, idx) => idx !== index)
          : [];
        return {
          ...draft,
          keyFeatures: features.length ? features : [""],
        };
      });
    },
    [updateProductDraft],
  );

  const handleSizeChange = useCallback(
    (index, field, value) => {
      updateProductDraft((draft) => {
        const existingSizes = Array.isArray(draft.sizes)
          ? [...draft.sizes]
          : [];
        const sizes = existingSizes.length
          ? existingSizes
          : buildDefaultSizes().map((size) => ({
              label: size.label,
              isAvailable: true,
              stock: "0",
            }));

        const target = sizes[index] || {
          label: "",
          isAvailable: true,
          stock: "0",
        };

        sizes[index] = {
          ...target,
          [field]: field === "stock" ? String(value) : value,
        };

        const totalStock = computeSizeStockTotal(
          sizes.map((size) => ({
            ...size,
            stock: Number(size.stock ?? 0),
          })),
        );

        return {
          ...draft,
          sizes,
          stock:
            draft.showSizes &&
            !LOCKED_AVAILABILITY_STATUSES.includes(draft.availabilityStatus)
              ? String(totalStock)
              : draft.stock,
        };
      });
    },
    [updateProductDraft],
  );

  const handleAddSize = useCallback(() => {
    updateProductDraft((draft) => ({
      ...draft,
      sizes: [
        ...(draft.sizes && draft.sizes.length
          ? draft.sizes
          : buildDefaultSizes().map((size) => ({
              label: size.label,
              isAvailable: true,
              stock: "0",
            }))),
        {
          label: "",
          isAvailable: true,
          stock: "0",
        },
      ],
    }));
  }, [updateProductDraft]);

  const handleRemoveSize = useCallback(
    (index) => {
      updateProductDraft((draft) => {
        const sizes = Array.isArray(draft.sizes)
          ? draft.sizes.filter((_, idx) => idx !== index)
          : [];
        return {
          ...draft,
          sizes: sizes.length
            ? sizes
            : buildDefaultSizes().map((size) => ({
                label: size.label,
                isAvailable: true,
                stock: "0",
              })),
        };
      });
    },
    [updateProductDraft],
  );

  const handleSizeLabelChange = useCallback(
    (index, value) => {
      handleSizeChange(index, "label", value.toUpperCase());
    },
    [handleSizeChange],
  );

  const handleSizeStockChange = useCallback(
    (index, value) => {
      handleSizeChange(index, "stock", value);
    },
    [handleSizeChange],
  );

  const handleSizeAvailabilityChange = useCallback(
    (index, checked) => {
      handleSizeChange(index, "isAvailable", checked);
    },
    [handleSizeChange],
  );

  const handleThumbnailUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file for the thumbnail");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error("Thumbnail must be under 2MB");
        event.target.value = "";
        return;
      }

      setProductMediaUploading((prev) => ({ ...prev, thumbnail: true }));
      try {
        const dataUrl = await readFileAsDataURL(file);
        updateProductDraft((draft) => ({
          ...draft,
          thumbnail: dataUrl,
        }));
      } catch (error) {
        toast.error("Failed to load thumbnail image");
      } finally {
        setProductMediaUploading((prev) => ({ ...prev, thumbnail: false }));
        event.target.value = "";
      }
    },
    [updateProductDraft],
  );

  const handleRemoveThumbnail = useCallback(() => {
    updateProductDraft((draft) => ({
      ...draft,
      thumbnail: "",
    }));
  }, [updateProductDraft]);

  const handleGalleryUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) {
        return;
      }

      if (files.some((file) => !file.type.startsWith("image/"))) {
        toast.error("All gallery files must be images");
        event.target.value = "";
        return;
      }

      const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE);
      if (oversized) {
        toast.error("Each gallery image must be under 2MB");
        event.target.value = "";
        return;
      }

      setProductMediaUploading((prev) => ({ ...prev, gallery: true }));
      try {
        const images = await Promise.all(files.map(readFileAsDataURL));
        updateProductDraft((draft) => {
          const existingGallery = Array.isArray(draft.gallery)
            ? [...draft.gallery]
            : [];
          const merged = [...existingGallery, ...images];
          return {
            ...draft,
            gallery: merged,
            images: merged,
          };
        });
      } catch (error) {
        toast.error("Failed to load gallery images");
      } finally {
        setProductMediaUploading((prev) => ({ ...prev, gallery: false }));
        event.target.value = "";
      }
    },
    [updateProductDraft],
  );

  const handleRemoveGalleryImage = useCallback(
    (index) => {
      updateProductDraft((draft) => {
        const gallery = Array.isArray(draft.gallery)
          ? draft.gallery.filter((_, idx) => idx !== index)
          : [];
        return {
          ...draft,
          gallery,
          images: gallery,
        };
      });
    },
    [updateProductDraft],
  );

  const handleAddGalleryUrl = useCallback(() => {
    const trimmed = newGalleryUrl.trim();
    if (!trimmed) {
      return;
    }
    updateProductDraft((draft) => {
      const gallery = Array.isArray(draft.gallery) ? [...draft.gallery] : [];
      if (!gallery.includes(trimmed)) {
        gallery.push(trimmed);
      }
      return {
        ...draft,
        gallery,
        images: gallery,
      };
    });
    setNewGalleryUrl("");
  }, [newGalleryUrl, updateProductDraft]);

  const handleSetDraftField = useCallback(
    (field) => (event) => handleChangeProductDraft(field, event.target.value),
    [handleChangeProductDraft],
  );

  const handlePricingField = useCallback(
    (field) => (event) => handlePricingChange(field, event.target.value),
    [handlePricingChange],
  );

  const handleToggleField = useCallback(
    (field) => (event) => handleToggleProductDraft(field, event.target.checked),
    [handleToggleProductDraft],
  );

  const handleSizeLabelInput = useCallback(
    (index) => (event) => handleSizeLabelChange(index, event.target.value),
    [handleSizeLabelChange],
  );

  const handleSizeStockInput = useCallback(
    (index) => (event) => handleSizeStockChange(index, event.target.value),
    [handleSizeStockChange],
  );

  const handleSizeAvailabilityToggle = useCallback(
    (index) => (event) =>
      handleSizeAvailabilityChange(index, event.target.checked),
    [handleSizeAvailabilityChange],
  );

  const handleSubmitProductEdit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!productEditModal.data || !productEditModal.draft) {
        toast.error("Missing product information");
        return;
      }

      setProductEditModal((prev) => ({
        ...prev,
        isSubmitting: true,
        error: null,
      }));

      const draft = productEditModal.draft;

      const payload = {
        name: draft.name?.trim() || "",
        sku: draft.sku?.trim() || "",
        category: draft.category?.trim() || "",
        brand: draft.brand?.trim() || "",
        categoryPriority: normalizeCategoryPriority(draft.categoryPriority),
        price: Number(draft.price) || 0,
        originalPrice: Number(draft.originalPrice) || 0,
        discountPercentage:
          draft.discountPercentage !== "" && draft.discountPercentage !== null
            ? Number(draft.discountPercentage)
            : undefined,
        saveAmount:
          draft.saveAmount !== "" && draft.saveAmount !== null
            ? Number(draft.saveAmount)
            : undefined,
        costPrice:
          draft.costPrice !== "" && draft.costPrice !== null
            ? Number(draft.costPrice)
            : undefined,
        stock: Number(draft.stock) || 0,
        lowStockThreshold:
          draft.lowStockThreshold !== "" && draft.lowStockThreshold !== null
            ? Number(draft.lowStockThreshold)
            : undefined,
        availabilityStatus: draft.availabilityStatus || "in_stock",
        status: draft.status || "published",
        isFeatured: Boolean(draft.isFeatured),
        showSizes: Boolean(draft.showSizes),
        description: draft.description?.trim() || "",
        shortDescription: draft.shortDescription?.trim() || "",
        hsnCode: draft.hsnCode?.trim() || "",
        gstRate:
          draft.gstRate !== "" && draft.gstRate !== null
            ? Number(draft.gstRate)
            : undefined,
        thumbnail: draft.thumbnail || "",
        gallery: Array.isArray(draft.gallery) ? draft.gallery : [],
        images: Array.isArray(draft.images) ? draft.images : [],
        keyFeatures: Array.isArray(draft.keyFeatures)
          ? draft.keyFeatures.map((feature) => feature?.trim()).filter(Boolean)
          : [],
        sizes:
          draft.showSizes && Array.isArray(draft.sizes)
            ? draft.sizes.map((size) => ({
                label: size?.label?.trim() || "",
                stock: Number(size?.stock) || 0,
                isAvailable: Boolean(size?.isAvailable),
              }))
            : [],
        metadata:
          draft.metadata && typeof draft.metadata === "object"
            ? draft.metadata
            : undefined,
      };

      try {
        const updated = await updateAdminSellerProduct(
          productEditModal.data._id,
          payload,
        );

        toast.success("Product updated");

        const normalizedUpdated = normalizeSellerProduct(updated) || updated;

        setProducts((prev) =>
          prev.map((product) =>
            String(product._id) === String(updated._id)
              ? normalizeSellerProduct({ ...product, ...normalizedUpdated })
              : product,
          ),
        );

        setProductEditModal((prev) => ({
          ...prev,
          isSubmitting: false,
          isOpen: false,
        }));

        await loadProducts({ silent: true });
      } catch (error) {
        console.error("Failed to update seller product", error);
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to update seller product";
        toast.error(message);
        setProductEditModal((prev) => ({
          ...prev,
          isSubmitting: false,
          error: message,
        }));
      }
    },
    [productEditModal, loadProducts],
  );

  const handleCouponUpdate = async (couponId, updates) => {
    try {
      const updated = await updateAdminSellerCoupon(couponId, updates);
      toast.success("Coupon updated");
      setCoupons((prev) =>
        prev.map((coupon) =>
          coupon._id === updated._id ? { ...coupon, ...updated } : coupon,
        ),
      );
      setCouponEdit(null);
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to update seller coupon", error);
      toast.error(error.message || "Unable to update seller coupon");
    }
  };

  const handleCouponDelete = async (couponId) => {
    const coupon = coupons.find((item) => item._id === couponId);
    const confirmed = confirmDeletion({
      entity: "coupon",
      name: coupon?.code || couponId,
    });
    if (!confirmed) return;
    try {
      await deleteAdminSellerCoupon(couponId);
      toast.success("Coupon removed");
      setCoupons((prev) => prev.filter((coupon) => coupon._id !== couponId));
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to delete seller coupon", error);
      toast.error(error.message || "Unable to delete seller coupon");
    }
  };

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <Sidebar
          active="Seller Details"
          className="hidden md:flex md:w-64 md:flex-none"
          onNavigate={() => setIsSidebarOpen(false)}
        />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex md:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="bg-white w-72 max-w-sm h-full shadow-xl"
              >
                <Sidebar
                  active="Seller Details"
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
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Dashboard / Sellers</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Seller Control Centre
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-white">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={sellerSearch}
                    onChange={(event) => setSellerSearch(event.target.value)}
                    placeholder="Search sellers"
                    className="w-48 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadSellers({ silent: true })}
                  disabled={sellersRefreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={sellersRefreshing ? "animate-spin" : undefined}
                  />
                  {sellersRefreshing ? "Refreshing" : "Refresh Sellers"}
                </button>
              </div>
            </div>

            <section>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {summaries.map(({ label, value, icon: Icon, accent }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div
                      className={`flex items-center gap-3 text-sm font-medium ${accent}`}
                    >
                      <Icon size={18} /> {label}
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Sellers
                  </h2>
                  <p className="text-sm text-slate-500">
                    Manage every seller account with verification and access
                    controls.
                  </p>
                </div>
              </div>

              {sellersError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {sellersError}
                </div>
              )}

              {sellersLoading ? (
                <EmptyState
                  icon={UserPlus}
                  title="Loading sellers"
                  subtitle="Fetching marketplace seller roster..."
                />
              ) : filteredSellers.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="No sellers yet"
                  subtitle="Approved sellers will appear here for administration."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Seller
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Verification
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Metrics
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSellers.map((seller) => (
                        <tr key={seller._id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-slate-900">
                                {seller.name || "Seller"}
                              </span>
                              <span className="text-xs text-slate-500">
                                {seller.email} · @{seller.username}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div
                              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                              style={{
                                borderColor: seller.isVerified
                                  ? "#34d399"
                                  : "#f87171",
                                color: seller.isVerified
                                  ? "#047857"
                                  : "#b91c1c",
                              }}
                            >
                              {seller.isVerified ? (
                                <ShieldCheck size={14} />
                              ) : (
                                <ShieldAlert size={14} />
                              )}
                              {seller.isVerified ? "Verified" : "Pending"}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-xs text-slate-500 grid gap-1">
                              <span>
                                Products: {seller.metrics?.products || 0}
                              </span>
                              <span>Orders: {seller.metrics?.orders || 0}</span>
                              <span>
                                Coupons: {seller.metrics?.coupons || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-500">
                            {formatDate(seller.createdAt)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSellerView(seller)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                aria-label="View seller"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSellerEdit(seller)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                aria-label="Edit seller"
                              >
                                <PencilLine size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSellerDelete(seller)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                                aria-label="Delete seller"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Seller Products
                  </h2>
                  <p className="text-sm text-slate-500">
                    Review every product launched by sellers and keep listings
                    healthy.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    <Filter size={16} className="text-slate-400" />
                    <select
                      value={selectedSellerId}
                      onChange={(event) =>
                        setSelectedSellerId(event.target.value)
                      }
                      className="bg-transparent focus:outline-none"
                    >
                      <option value="all">All sellers</option>
                      {sellers.map((seller) => (
                        <option key={seller._id} value={seller._id}>
                          {seller.name || seller.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadProducts({ silent: true })}
                    disabled={productsRefreshing}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={16}
                      className={
                        productsRefreshing ? "animate-spin" : undefined
                      }
                    />
                    {productsRefreshing ? "Refreshing" : "Refresh Products"}
                  </button>
                </div>
              </div>

              {productsError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {productsError}
                </div>
              )}

              {productsLoading ? (
                <EmptyState
                  icon={Package}
                  title="Loading seller products"
                  subtitle="Collecting catalogue items..."
                />
              ) : products.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No seller products"
                  subtitle="Seller product listings will appear here."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Seller
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Pricing
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((product) => {
                        const statusInfo =
                          STATUS_LABELS[product.status] ||
                          STATUS_LABELS.archived;
                        const availabilityClass =
                          AVAILABILITY_BADGE_CLASSES[
                            product.availabilityStatus
                          ] || AVAILABILITY_BADGE_CLASSES.in_stock;
                        const availabilityLabel = getAvailabilityLabel(
                          product.availabilityStatus,
                        );
                        return (
                          <tr
                            key={product._id}
                            className="hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-slate-900">
                                  {product.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  SKU: {product.sku}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-slate-500">
                              {product.sellerId?.name ||
                                product.sellerId?.username ||
                                "Seller"}
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-slate-500">
                              <div className="grid gap-1">
                                <span>
                                  Price: {formatCurrency(product.price)}
                                </span>
                                <span>Stock: {product.stock ?? 0}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                                >
                                  {statusInfo.label}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${availabilityClass}`}
                                >
                                  {availabilityLabel}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewProduct(product._id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                  aria-label="View product"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenEditProduct(product._id)
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                  aria-label="Edit product"
                                >
                                  <PencilLine size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleProductDelete(product._id)
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                                  aria-label="Delete product"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Seller Orders
                  </h2>
                  <p className="text-sm text-slate-500">
                    Monitor seller fulfilment pipelines and adjust statuses
                    instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadOrders({ silent: true })}
                  disabled={ordersRefreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={ordersRefreshing ? "animate-spin" : undefined}
                  />
                  {ordersRefreshing ? "Refreshing" : "Refresh Orders"}
                </button>
              </div>

              <form
                onSubmit={handleOrderFiltersSubmit}
                className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5"
              >
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Order status
                  </span>
                  <select
                    value={orderStatusDraft}
                    onChange={(event) =>
                      setOrderStatusDraft(event.target.value)
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="">All statuses</option>
                    {ORDER_STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Seller name
                  </span>
                  <input
                    type="text"
                    value={orderSellerNameDraft}
                    onChange={(event) =>
                      setOrderSellerNameDraft(event.target.value)
                    }
                    placeholder="e.g. Vishal"
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Min amount (₹)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={orderMinAmountDraft}
                    onChange={(event) =>
                      setOrderMinAmountDraft(
                        sanitizeAmountInput(event.target.value),
                      )
                    }
                    placeholder="0"
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Max amount (₹)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={orderMaxAmountDraft}
                    onChange={(event) =>
                      setOrderMaxAmountDraft(
                        sanitizeAmountInput(event.target.value),
                      )
                    }
                    placeholder="1000"
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                  />
                </label>
                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-1">
                  <button
                    type="submit"
                    disabled={ordersLoading || ordersRefreshing}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
                  >
                    Apply filters
                  </button>
                  <button
                    type="button"
                    onClick={handleOrderFiltersReset}
                    disabled={ordersLoading || ordersRefreshing}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {ordersError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {ordersError}
                </div>
              )}

              {ordersLoading ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Loading seller orders"
                  subtitle="Gathering fulfilment data..."
                />
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="No seller orders"
                  subtitle="Seller orders will surface as soon as customers purchase."
                />
              ) : (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <span>
                      Showing{" "}
                      {ordersPagination.total
                        ? ordersPagination.startIndex + 1
                        : 0}
                      -{ordersPagination.endIndex} of {ordersPagination.total}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportOrders}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeleteOrders}
                        disabled={!orderSelection.size}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Bulk delete ({orderSelection.size})
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50/80">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left font-semibold text-slate-500">
                            <input
                              ref={ordersHeaderCheckboxRef}
                              type="checkbox"
                              checked={areAllOrdersSelected}
                              onChange={handleToggleAllOrders}
                              className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Order
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Seller
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Totals
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedOrders.map((order) => {
                          const orderId = String(order._id);
                          const invoiceReady = isOrderInvoiceAvailable(order);
                          const isSelected = orderSelection.has(orderId);
                          return (
                            <tr key={orderId} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 align-top">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleOrderSelection(orderId)
                                  }
                                  className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {order.orderId || orderId}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {order.items?.length || 0} item(s)
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                {order.sellerId?.name ||
                                  order.sellerId?.companyName ||
                                  order.sellerId?.username ||
                                  "Seller"}
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                <div className="grid gap-1">
                                  <span className="text-sm font-medium text-slate-700">
                                    {order.customerName ||
                                      order.buyerName ||
                                      order.shippingAddress?.fullName ||
                                      "Customer"}
                                  </span>
                                  {order.customerEmail ||
                                  order.buyerEmail ||
                                  order.shippingAddress?.email ? (
                                    <span className="break-all text-xs text-slate-500">
                                      {order.customerEmail ||
                                        order.buyerEmail ||
                                        order.shippingAddress?.email}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                <div className="grid gap-1">
                                  <span>
                                    Total:{" "}
                                    {formatCurrency(
                                      order.orderPricing?.total ??
                                        order.totals?.revenue,
                                    )}
                                  </span>
                                  <span>
                                    Quantity:{" "}
                                    {order.orderPricing?.quantity ??
                                      order.totals?.quantity ??
                                      0}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                <div className="grid gap-1">
                                  <span>Order: {order.orderStatus}</span>
                                  <span>Payment: {order.paymentStatus}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOrderView(order)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                    aria-label="View order"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadInvoice(order)}
                                    disabled={
                                      !invoiceReady ||
                                      downloadingInvoiceId === orderId
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                                    aria-label="Download invoice"
                                    title={
                                      invoiceReady
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
                                    onClick={() => setOrderEdit(order)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                    aria-label="Edit order"
                                  >
                                    <PencilLine size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOrderDelete(order._id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                                    aria-label="Delete order"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      Rows per page
                      <select
                        value={ordersRowsPerPage}
                        onChange={handleOrdersRowsPerPageChange}
                        className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                      >
                        {[10, 20, 50].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleOrdersPageChange(
                            ordersPagination.currentPage - 1,
                          )
                        }
                        disabled={ordersPagination.currentPage <= 1}
                        className="rounded-xl border border-slate-200 px-3 py-1 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span>
                        Page{" "}
                        <span className="font-semibold">
                          {ordersPagination.currentPage}
                        </span>{" "}
                        of
                        <span className="font-semibold">
                          {" "}
                          {ordersPagination.totalPages}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleOrdersPageChange(
                            ordersPagination.currentPage + 1,
                          )
                        }
                        disabled={
                          ordersPagination.currentPage >=
                          ordersPagination.totalPages
                        }
                        className="rounded-xl border border-slate-200 px-3 py-1 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 pb-12">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Seller Coupons
                  </h2>
                  <p className="text-sm text-slate-500">
                    Keep seller coupons in sync with platform-wide promotional
                    policies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadCoupons({ silent: true })}
                  disabled={couponsRefreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={couponsRefreshing ? "animate-spin" : undefined}
                  />
                  {couponsRefreshing ? "Refreshing" : "Refresh Coupons"}
                </button>
              </div>

              {couponsError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {couponsError}
                </div>
              )}

              {couponsLoading ? (
                <EmptyState
                  icon={TicketPercent}
                  title="Loading seller coupons"
                  subtitle="Syncing incentive programs..."
                />
              ) : coupons.length === 0 ? (
                <EmptyState
                  icon={TicketPercent}
                  title="No seller coupons"
                  subtitle="Seller-generated coupons will surface here."
                />
              ) : (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                    <span>
                      Showing{" "}
                      {couponsPagination.total
                        ? couponsPagination.startIndex + 1
                        : 0}
                      -{couponsPagination.endIndex} of {couponsPagination.total}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportCoupons}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeleteCoupons}
                        disabled={!couponSelection.size}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Bulk delete ({couponSelection.size})
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50/80">
                        <tr>
                          <th className="w-12 px-4 py-3 text-left font-semibold text-slate-500">
                            <input
                              ref={couponsHeaderCheckboxRef}
                              type="checkbox"
                              checked={areAllCouponsSelected}
                              onChange={handleToggleAllCoupons}
                              className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Code
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Seller
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Discount
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-500">
                            Usage
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedCoupons.map((coupon) => {
                          const couponId = String(coupon._id);
                          const isSelected = couponSelection.has(couponId);
                          return (
                            <tr key={couponId} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 align-top">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleCouponSelection(couponId)
                                  }
                                  className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {coupon.code}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {coupon.description || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                {coupon.sellerId?.name ||
                                  coupon.sellerId?.username ||
                                  "Seller"}
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                <div className="grid gap-1">
                                  <span>
                                    {coupon.discountType === "percentage"
                                      ? `${coupon.discountValue}%`
                                      : formatCurrency(coupon.discountValue)}
                                  </span>
                                  <span>
                                    Min order:{" "}
                                    {formatCurrency(coupon.minOrderAmount || 0)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-slate-500">
                                <div className="grid gap-1">
                                  <span>
                                    Active: {coupon.isActive ? "Yes" : "No"}
                                  </span>
                                  <span>
                                    Redeemed: {coupon.usageCount || 0} /{" "}
                                    {coupon.maxRedemptions || "∞"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCouponView(coupon)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                    aria-label="View coupon"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCouponEdit(coupon)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                    aria-label="Edit coupon"
                                  >
                                    <PencilLine size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCouponDelete(coupon._id)
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                                    aria-label="Delete coupon"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      Rows per page
                      <select
                        value={couponsRowsPerPage}
                        onChange={handleCouponsRowsPerPageChange}
                        className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                      >
                        {[10, 20, 50].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleCouponsPageChange(
                            couponsPagination.currentPage - 1,
                          )
                        }
                        disabled={couponsPagination.currentPage <= 1}
                        className="rounded-xl border border-slate-200 px-3 py-1 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span>
                        Page{" "}
                        <span className="font-semibold">
                          {couponsPagination.currentPage}
                        </span>{" "}
                        of
                        <span className="font-semibold">
                          {" "}
                          {couponsPagination.totalPages}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCouponsPageChange(
                            couponsPagination.currentPage + 1,
                          )
                        }
                        disabled={
                          couponsPagination.currentPage >=
                          couponsPagination.totalPages
                        }
                        className="rounded-xl border border-slate-200 px-3 py-1 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <BaseModal
        isOpen={Boolean(sellerView)}
        title={
          sellerView
            ? sellerView.companyName || sellerView.name || sellerView.username
            : "Seller"
        }
        onClose={() => setSellerView(null)}
      >
        {sellerView ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase text-slate-400">Contact</p>
              <div className="mt-1 text-sm text-slate-600">
                <p>Company: {sellerView.companyName || "--"}</p>
                <p>Email: {sellerView.email}</p>
                <p>Location: {sellerView.location || "--"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Status</p>
              <div className="mt-1 text-sm text-slate-600">
                <p>Verified: {sellerView.isVerified ? "Yes" : "No"}</p>
                <p>Role: {sellerView.role || "--"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Metrics</p>
              <div className="mt-1 text-sm text-slate-600">
                <p>Products: {sellerView.metrics?.products || 0}</p>
                <p>Orders: {sellerView.metrics?.orders || 0}</p>
                <p>Coupons: {sellerView.metrics?.coupons || 0}</p>
                <p>
                  Revenue: {formatCurrency(sellerView.metrics?.revenue || 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Joined {formatDate(sellerView.createdAt)}
            </p>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(sellerEdit)}
        title={
          sellerEdit
            ? `Edit ${sellerEdit.name || sellerEdit.username}`
            : "Edit seller"
        }
        onClose={() =>
          !isSavingSeller && !isDeletingSeller && setSellerEdit(null)
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setSellerEdit(null)}
              disabled={isSavingSeller}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                handleSellerUpdate({
                  username: sellerEdit?.username,
                  role: sellerEdit?.role,
                  isVerified: !sellerEdit?.isVerified,
                })
              }
              disabled={isSavingSeller}
              className="inline-flex items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSavingSeller
                ? "Saving..."
                : sellerEdit?.isVerified
                  ? "Mark Unverified"
                  : "Mark Verified"}
            </button>
            <button
              type="button"
              onClick={handleSellerDelete}
              disabled={isDeletingSeller}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingSeller ? "Removing..." : "Delete Seller"}
            </button>
          </>
        }
      >
        {sellerEdit ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Username:{" "}
              <span className="font-medium">@{sellerEdit.username}</span>
            </p>
            <p>Email: {sellerEdit.email}</p>
            <p>
              Current status:{" "}
              {sellerEdit.isVerified ? "Verified" : "Pending verification"}
            </p>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={productViewModal.isOpen}
        title="Product Details"
        onClose={handleCloseViewProduct}
      >
        {productViewModal.loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            Loading product details...
          </div>
        ) : productViewModal.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {productViewModal.error}
          </div>
        ) : productViewModal.data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-slate-400">Name</p>
                    <p className="text-base font-semibold text-slate-900">
                      {productViewModal.data.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">SKU</p>
                    <p className="text-sm font-medium text-slate-700">
                      {productViewModal.data.sku ||
                        productViewModal.data._id ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Category</p>
                    <p className="text-sm text-slate-700">
                      {productViewModal.data.category || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Brand</p>
                    <p className="text-sm text-slate-700">
                      {productViewModal.data.brand || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Seller</p>
                    <p className="text-sm text-slate-700">
                      {productViewModal.data.sellerId?.companyName ||
                        productViewModal.data.sellerId?.name ||
                        productViewModal.data.sellerId?.username ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      HSN / GST
                    </p>
                    <p className="text-sm text-slate-700">
                      {productViewModal.data.hsnCode || "—"} ·{" "}
                      {productViewModal.data.gstRate !== undefined &&
                      productViewModal.data.gstRate !== null
                        ? `${productViewModal.data.gstRate}%`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-400">Price</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(productViewModal.data.price)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Original{" "}
                      {formatCurrency(productViewModal.data.originalPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-400">Stock</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {productViewModal.data.stock ?? 0}
                    </p>
                    <p className="text-xs text-slate-500">
                      Availability:{" "}
                      {getAvailabilityLabel(
                        productViewModal.data.availabilityStatus,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-400">Status</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {STATUS_LABELS[productViewModal.data.status]?.label ||
                        productViewModal.data.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      Featured:{" "}
                      {productViewModal.data.isFeatured ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-400">Discount</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {Number(productViewModal.data.discountPercentage ?? 0)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      Savings:{" "}
                      {formatCurrency(productViewModal.data.saveAmount ?? 0)}
                    </p>
                  </div>
                </div>

                {productViewModal.data.shortDescription ? (
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      Short Description
                    </p>
                    <p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      {productViewModal.data.shortDescription}
                    </p>
                  </div>
                ) : null}

                {productViewModal.data.description ? (
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      Description
                    </p>
                    <p className="mt-1 whitespace-pre-line rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      {productViewModal.data.description}
                    </p>
                  </div>
                ) : null}

                {Array.isArray(productViewModal.data.keyFeatures) &&
                productViewModal.data.keyFeatures.length ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-slate-400">
                      Key Features
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {productViewModal.data.keyFeatures.map(
                        (feature, index) => (
                          <li
                            key={`${feature}-${index}`}
                            className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600"
                          >
                            {feature}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(productViewModal.data.sizes) &&
                productViewModal.data.sizes.length ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-slate-400">Sizes</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {productViewModal.data.sizes.map((size, index) => (
                        <div
                          key={`${size?.label || "size"}-${index}`}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600"
                        >
                          <p className="text-xs font-semibold text-slate-500">
                            {size?.label || "—"}
                          </p>
                          <p className="text-sm text-slate-700">
                            Stock: {size?.stock ?? 0}
                          </p>
                          <p className="text-xs text-slate-500">
                            {size?.isAvailable ? "Available" : "Not available"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                  <img
                    src={
                      productViewModal.data.thumbnail ||
                      productViewModal.data.gallery?.[0] ||
                      "https://placehold.co/480x480/f8fafc/e2e8f0?text=Thumbnail"
                    }
                    alt={productViewModal.data.name || "Product thumbnail"}
                    className="h-64 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src =
                        "https://placehold.co/480x480/f8fafc/e2e8f0?text=Image";
                    }}
                  />
                </div>

                {Array.isArray(productViewModal.data.gallery) &&
                productViewModal.data.gallery.length > 1 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-slate-400">Gallery</p>
                    <div className="grid grid-cols-3 gap-2">
                      {productViewModal.data.gallery.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          <img
                            src={image}
                            alt={`${productViewModal.data.name || "Product"} ${
                              index + 1
                            }`}
                            className="h-24 w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.src =
                                "https://placehold.co/200x200/f8fafc/e2e8f0?text=Image";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={productEditModal.isOpen}
        title={
          productEditModal.data?.name
            ? `Edit ${productEditModal.data.name}`
            : "Edit product"
        }
        onClose={() => {
          if (!productEditModal.isSubmitting) {
            handleCloseEditProduct();
          }
        }}
      >
        {productEditModal.loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            Loading product details...
          </div>
        ) : productEditModal.error ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {productEditModal.error}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCloseEditProduct}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : productEditModal.data && productEditModal.draft ? (
          <form onSubmit={handleSubmitProductEdit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Price (₹)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productEditModal.draft.price}
                  onChange={(event) =>
                    handleChangeProductDraft("price", event.target.value)
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Original price (₹)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productEditModal.draft.originalPrice}
                  onChange={(event) =>
                    handleChangeProductDraft(
                      "originalPrice",
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Stock
                </span>
                <input
                  type="number"
                  min="0"
                  value={productEditModal.draft.stock}
                  onChange={(event) =>
                    handleChangeProductDraft("stock", event.target.value)
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Availability status
                </span>
                <select
                  value={productEditModal.draft.availabilityStatus}
                  onChange={(event) =>
                    handleChangeProductDraft(
                      "availabilityStatus",
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                >
                  <option value="in_stock">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="preorder">Pre-order</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </span>
                <select
                  value={productEditModal.draft.status}
                  onChange={(event) =>
                    handleChangeProductDraft("status", event.target.value)
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                >
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseEditProduct}
                disabled={productEditModal.isSubmitting}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={productEditModal.isSubmitting}
                className="inline-flex items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-blue-300 disabled:bg-blue-300"
              >
                {productEditModal.isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-600">No product selected</p>
        )}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(orderView)}
        title={orderView ? `Order ${orderView.orderId}` : "Order"}
        onClose={() => setOrderView(null)}
      >
        {orderView ? (
          <div className="space-y-3 text-sm text-slate-600">
            <div className="grid gap-1">
              <p>Status: {orderView.orderStatus}</p>
              <p>Payment: {orderView.paymentStatus}</p>
              <p>Revenue: {formatCurrency(orderView.totals?.revenue)}</p>
              <p>Quantity: {orderView.totals?.quantity ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Items</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {orderView.items?.map((item) => (
                  <li
                    key={`${item.productId}-${item.name}`}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Qty {item.quantity} · {formatCurrency(item.price)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(orderEdit)}
        title={orderEdit ? `Update order ${orderEdit.orderId}` : "Update order"}
        onClose={() => {
          if (!isSavingOrder) {
            setOrderEdit(null);
          }
        }}
        footer={
          <button
            type="button"
            onClick={() => {
              if (!orderEdit) return;
              handleOrderUpdate(orderEdit._id, {
                orderStatus: orderEdit.orderStatus,
                paymentStatus: orderEdit.paymentStatus,
                estimatedDeliveryDate: orderEdit.estimatedDeliveryDate,
              });
            }}
            disabled={isSavingOrder}
            className="inline-flex items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {isSavingOrder ? "Saving..." : "Save Changes"}
          </button>
        }
      >
        {orderEdit ? (
          <div className="space-y-3 text-sm text-slate-600">
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Order status</span>
              <select
                value={orderEdit.orderStatus || "processing"}
                onChange={(event) =>
                  setOrderEdit((prev) => ({
                    ...prev,
                    orderStatus: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              >
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Payment status</span>
              <select
                value={orderEdit.paymentStatus || "pending"}
                onChange={(event) =>
                  setOrderEdit((prev) => ({
                    ...prev,
                    paymentStatus: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              >
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Estimated delivery</span>
              <input
                type="date"
                value={
                  orderEdit.estimatedDeliveryDate
                    ? orderEdit.estimatedDeliveryDate.split("T")[0]
                    : ""
                }
                onChange={(event) =>
                  setOrderEdit((prev) => ({
                    ...prev,
                    estimatedDeliveryDate: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : null,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              />
            </label>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(couponView)}
        title={couponView ? `Coupon ${couponView.code}` : "Coupon"}
        onClose={() => setCouponView(null)}
      >
        {couponView ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Description: {couponView.description || "—"}</p>
            <p>
              Discount:{" "}
              {couponView.discountType === "percentage"
                ? `${couponView.discountValue}%`
                : formatCurrency(couponView.discountValue)}
            </p>
            <p>
              Usage: {couponView.usageCount || 0} /{" "}
              {couponView.maxRedemptions || "∞"}
            </p>
            <p>Active: {couponView.isActive ? "Yes" : "No"}</p>
            <p>
              Valid from: {formatDate(couponView.startDate)} ·{" "}
              {formatDate(couponView.endDate)}
            </p>
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(couponEdit)}
        title={couponEdit ? `Edit coupon ${couponEdit.code}` : "Edit coupon"}
        onClose={() => setCouponEdit(null)}
        footer={
          <button
            type="button"
            onClick={() => {
              if (!couponEdit) return;
              handleCouponUpdate(couponEdit._id, {
                description: couponEdit.description,
                discountType: couponEdit.discountType,
                discountValue:
                  couponEdit.discountType === "percentage"
                    ? Number(couponEdit.discountValue) || 0
                    : Number(couponEdit.discountValue) || 0,
                minOrderAmount: Number(couponEdit.minOrderAmount) || 0,
                maxRedemptions: Number(couponEdit.maxRedemptions) || 0,
                isActive: Boolean(couponEdit.isActive),
              });
            }}
            className="inline-flex items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Save Changes
          </button>
        }
      >
        {couponEdit ? (
          <div className="space-y-4 text-sm text-slate-600">
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Description</span>
              <textarea
                value={couponEdit.description || ""}
                onChange={(event) =>
                  setCouponEdit((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                rows={3}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Discount type</span>
                <select
                  value={couponEdit.discountType || "percentage"}
                  onChange={(event) =>
                    setCouponEdit((prev) => ({
                      ...prev,
                      discountType: event.target.value,
                      discountValue: prev.discountValue,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                >
                  <option value="percentage">Percentage</option>
                  <option value="amount">Flat amount</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">
                  {couponEdit.discountType === "amount"
                    ? "Discount amount (₹)"
                    : "Discount percentage (%)"}
                </span>
                <input
                  type="number"
                  min="0"
                  step={couponEdit.discountType === "amount" ? "0.01" : "1"}
                  value={couponEdit.discountValue ?? ""}
                  onChange={(event) =>
                    setCouponEdit((prev) => ({
                      ...prev,
                      discountValue: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs text-slate-500">
                  Minimum order amount (₹)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={couponEdit.minOrderAmount ?? ""}
                  onChange={(event) =>
                    setCouponEdit((prev) => ({
                      ...prev,
                      minOrderAmount: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-500">Max redemptions</span>
                <input
                  type="number"
                  min="1"
                  value={couponEdit.maxRedemptions ?? ""}
                  onChange={(event) =>
                    setCouponEdit((prev) => ({
                      ...prev,
                      maxRedemptions: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                />
              </label>
            </div>

            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={Boolean(couponEdit.isActive)}
                onChange={(event) =>
                  setCouponEdit((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">Coupon is active</span>
            </label>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
};

export default AdminSellerDetailsPage;
