import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Plus,
  Filter,
  CalendarRange,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  Star,
  AlertCircle,
  RefreshCw,
  X,
  Calendar,
  Package,
  Layers,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchSellerProducts, deleteSellerProduct } from "../utils/api";

const statusBadge = {
  published: "bg-emerald-100 text-emerald-600",
  archived: "bg-slate-200 text-slate-600",
};

const availabilityBadge = {
  in_stock: "bg-emerald-50 text-emerald-600",
  low_stock: "bg-amber-50 text-amber-600",
  out_of_stock: "bg-rose-50 text-rose-600",
  preorder: "bg-sky-50 text-sky-600",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const AVAILABILITY_FILTER_OPTIONS = [
  { value: "", label: "All Availability" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "preorder", label: "Preorder" },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const resolveCategory = (product = {}) => {
  if (typeof product.category === "string" && product.category.trim()) {
    return product.category.trim();
  }
  if (typeof product.category === "object" && product.category?.name) {
    return product.category.name;
  }
  if (typeof product.categoryName === "string" && product.categoryName.trim()) {
    return product.categoryName.trim();
  }
  return "-";
};

const resolveThumbnail = (product = {}) => {
  if (product.thumbnail) {
    return product.thumbnail;
  }
  if (Array.isArray(product.gallery) && product.gallery.length) {
    return product.gallery[0];
  }
  if (Array.isArray(product.images) && product.images.length) {
    return product.images[0];
  }
  return "";
};

const SellerProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [sortConfig, setSortConfig] = useState({ field: "", direction: "asc" });
  const [deletingId, setDeletingId] = useState("");
  const [viewingProduct, setViewingProduct] = useState(null);
  const [productFilters, setProductFilters] = useState({
    status: "",
    availability: "",
    dateRange: {
      startDate: "",
      endDate: "",
    },
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const filterMenuRef = useRef(null);
  const datePickerRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  const handleStatusFilterChange = (value) => {
    setPage(1);
    setProductFilters((prev) => ({ ...prev, status: value }));
  };

  const handleAvailabilityChange = (value) => {
    setPage(1);
    setProductFilters((prev) => ({ ...prev, availability: value }));
  };

  const handleDateChange = (field, value) => {
    setPage(1);
    setProductFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value,
      },
    }));
  };

  const clearDateFilters = () => {
    setPage(1);
    setProductFilters((prev) => ({
      ...prev,
      dateRange: { startDate: "", endDate: "" },
    }));
  };

  const clearFilter = (key) => {
    setPage(1);
    setProductFilters((prev) => {
      if (key === "status") {
        return { ...prev, status: "" };
      }
      if (key === "availability") {
        return { ...prev, availability: "" };
      }
      if (key === "dateRange") {
        return { ...prev, dateRange: { startDate: "", endDate: "" } };
      }
      return prev;
    });
  };

  const clearAllFilters = () => {
    setPage(1);
    setProductFilters({
      status: "",
      availability: "",
      dateRange: { startDate: "", endDate: "" },
    });
    setShowFilters(false);
    setShowDatePicker(false);
  };

  const resolveOptionLabel = (options, value) =>
    options.find((option) => option.value === value)?.label || value;

  const activeFilters = useMemo(() => {
    const entries = [];
    if (productFilters.status) {
      entries.push({
        key: "status",
        label: `Status: ${resolveOptionLabel(
          STATUS_FILTER_OPTIONS,
          productFilters.status
        )}`,
      });
    }
    if (productFilters.availability) {
      entries.push({
        key: "availability",
        label: `Availability: ${resolveOptionLabel(
          AVAILABILITY_FILTER_OPTIONS,
          productFilters.availability
        )}`,
      });
    }

    if (
      productFilters.dateRange.startDate ||
      productFilters.dateRange.endDate
    ) {
      const { startDate, endDate } = productFilters.dateRange;
      const label =
        [startDate, endDate].filter(Boolean).join(" → ") || "Date range";
      entries.push({ key: "dateRange", label: `Dates: ${label}` });
    }

    return entries;
  }, [productFilters]);

  const hasActiveFilters = Boolean(
    productFilters.status ||
      productFilters.availability ||
      productFilters.dateRange.startDate ||
      productFilters.dateRange.endDate
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!viewingProduct) {
      return undefined;
    }

    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousPaddingRight = style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      style.overflow = previousOverflow;
      style.paddingRight = previousPaddingRight;
    };
  }, [viewingProduct]);

  useEffect(() => {
    if (!showFilters && !showDatePicker) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        showFilters &&
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target)
      ) {
        setShowFilters(false);
      }

      if (
        showDatePicker &&
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters, showDatePicker]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchValue]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { status, availability, dateRange } = productFilters;
        const response = await fetchSellerProducts({
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          status: status || undefined,
          availability: availability || undefined,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        });
        if (!isMounted) return;
        const payload = response?.data || [];
        setProducts(payload);
        setMeta(
          response?.meta || {
            page: 1,
            limit: 20,
            total: payload.length,
            totalPages: 1,
          }
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load products");
        setProducts([]);
        setMeta({ page: 1, limit: 20, total: 0, totalPages: 1 });
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
    debouncedSearch,
    refreshToken,
    productFilters.status,
    productFilters.availability,
    productFilters.dateRange.startDate,
    productFilters.dateRange.endDate,
  ]);

  useEffect(() => {
    if (!viewingProduct) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewingProduct]);

  const processedRows = useMemo(() => {
    const base = products.map((product) => {
      const numericPrice = Number(product.price) || 0;
      const availability = product.availabilityStatus || "unknown";
      const createdAt = product.createdAt || product.updatedAt;
      const variantsCount = Array.isArray(product.variants)
        ? product.variants.length
        : Array.isArray(product.sizes)
        ? product.sizes.length
        : 0;

      const brand =
        typeof product.brand === "string" ? product.brand.trim() : "";
      const sku = typeof product.sku === "string" ? product.sku.trim() : "";

      return {
        raw: product,
        id: product._id,
        name: product.name || "Unnamed product",
        sku: sku || "-",
        brand,
        category: resolveCategory(product),
        thumbnail: resolveThumbnail(product),
        variants: variantsCount,
        stock: Number.isFinite(product.stock) ? product.stock : 0,
        availability,
        status: product.status || "-",
        isFeatured: Boolean(product.isFeatured),
        priceValue: numericPrice,
        displayPrice: formatCurrency(numericPrice),
        createdAt: formatDate(createdAt),
      };
    });

    if (sortConfig.field === "price") {
      const sorted = [...base].sort((a, b) => {
        if (sortConfig.direction === "asc") {
          return a.priceValue - b.priceValue;
        }
        return b.priceValue - a.priceValue;
      });
      return sorted;
    }

    return base;
  }, [products, sortConfig]);

  const metrics = useMemo(() => {
    const totalProducts = meta.total || processedRows.length;

    let fallbackLowStock = 0;
    let fallbackOutOfStock = 0;

    processedRows.forEach((entry) => {
      if (entry.availability === "low_stock") {
        fallbackLowStock += 1;
      }
      if (entry.availability === "out_of_stock") {
        fallbackOutOfStock += 1;
      }
    });

    const lowStock =
      meta?.counts?.lowStock != null ? meta.counts.lowStock : fallbackLowStock;
    const outOfStock =
      meta?.counts?.outOfStock != null
        ? meta.counts.outOfStock
        : fallbackOutOfStock;

    return {
      totalProducts,
      lowStock,
      outOfStock,
      selected: selectedIds.size,
    };
  }, [meta, processedRows, selectedIds.size]);

  const allVisibleSelected = useMemo(() => {
    if (!processedRows.length) return false;
    return processedRows.every((row) => selectedIds.has(row.id));
  }, [processedRows, selectedIds]);

  const toggleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field, direction: "asc" };
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        processedRows.forEach((row) => next.delete(row.id));
      } else {
        processedRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const toggleRowSelection = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (!processedRows.length) {
      toast.error("No products to export");
      return;
    }

    try {
      const headers = [
        "Name",
        "ID",
        "Category",
        "SKU",
        "Price",
        "Stock",
        "Availability",
        "Status",
      ];

      const rows = processedRows.map((row) => [
        row.name,
        row.id,
        row.category,
        row.sku,
        row.priceValue,
        row.stock,
        row.availability,
        row.status,
      ]);

      const csv = [headers, ...rows]
        .map((line) =>
          line
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `seller-products-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Exported products as CSV");
    } catch (exportError) {
      console.error("Failed to export seller products", exportError);
      toast.error("Failed to export products");
    }
  };

  const handleViewProduct = (row) => {
    if (!row?.raw) {
      toast.error("Product information missing");
      return;
    }

    setViewingProduct(row.raw);
  };

  const handleEditProduct = (row) => {
    if (!row?.id) {
      toast.error("Product information missing");
      return;
    }

    navigate(`/seller/products/${row.id}`);
  };

  const handleDeleteProduct = async (row) => {
    if (!row?.id) {
      toast.error("Product information missing");
      return;
    }

    const confirmed = window.confirm(
      `Delete product "${row.name}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(row.id);
      await deleteSellerProduct(row.id);
      toast.success("Product deleted");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      setRefreshToken((prev) => prev + 1);
    } catch (error) {
      const message = error?.message || "Failed to delete product";
      toast.error(message);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">
            Dashboard / Products
          </p>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
              >
                <Download size={16} /> Export
              </button>
              <Link
                to="/seller/products/new"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={16} /> Add Product
              </Link>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Total Products
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {metrics.totalProducts}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Low Stock
            </p>
            <p className="mt-3 text-2xl font-semibold text-amber-600">
              {metrics.lowStock}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Out of Stock
            </p>
            <p className="mt-3 text-2xl font-semibold text-rose-600">
              {metrics.outOfStock}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Selected
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {metrics.selected}
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 focus-within:border-blue-300 focus-within:bg-white">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, SKU, ID or category"
              className="h-9 w-full bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setShowDatePicker((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  productFilters.dateRange.startDate ||
                  productFilters.dateRange.endDate
                    ? "border-blue-200 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-white hover:text-blue-600"
                }`}
              >
                <CalendarRange size={16} /> Select Dates
              </button>
              {showDatePicker && (
                <div className="absolute left-0 z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                  <div className="flex flex-col gap-3 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">
                        Start Date
                      </span>
                      <input
                        type="date"
                        value={productFilters.dateRange.startDate}
                        onChange={(event) =>
                          handleDateChange("startDate", event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">
                        End Date
                      </span>
                      <input
                        type="date"
                        value={productFilters.dateRange.endDate}
                        onChange={(event) =>
                          handleDateChange("endDate", event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </label>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={clearDateFilters}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        Clear dates
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  hasActiveFilters
                    ? "border-blue-200 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-white hover:text-blue-600"
                }`}
              >
                <Filter size={16} /> Filters
              </button>
              {showFilters && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                  <div className="space-y-4 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">
                        Status
                      </span>
                      <select
                        value={productFilters.status}
                        onChange={(event) =>
                          handleStatusFilterChange(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                      >
                        {STATUS_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">
                        Availability
                      </span>
                      <select
                        value={productFilters.availability}
                        onChange={(event) =>
                          handleAvailabilityChange(event.target.value)
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                      >
                        {AVAILABILITY_FILTER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-slate-500 hover:text-rose-500"
                      >
                        Clear all
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeFilters.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {activeFilters.map((entry) => (
              <span
                key={entry.key}
                className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-600"
              >
                {entry.label}
                <button
                  type="button"
                  onClick={() => clearFilter(entry.key)}
                  className="rounded-full bg-white/80 p-1 text-blue-500 hover:text-rose-500"
                  aria-label={`Clear ${entry.key} filter`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
          <button
            type="button"
            onClick={() => setRefreshToken((prev) => prev + 1)}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="md:hidden">
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <span className="block h-4 w-3/4 rounded bg-slate-100" />
                      <span className="block h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <span className="block h-3 w-full rounded bg-slate-100" />
                    <span className="block h-3 w-5/6 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : processedRows.length ? (
            <div className="grid gap-3">
              {processedRows.map((row) => {
                const availabilityClass =
                  availabilityBadge[row.availability] ||
                  "bg-slate-100 text-slate-500";
                const statusClass =
                  statusBadge[row.status] || "bg-slate-100 text-slate-500";
                const isSelected = selectedIds.has(row.id);

                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(row.id)}
                        aria-label={`Select ${row.name}`}
                      />
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {row.thumbnail ? (
                            <img
                              src={row.thumbnail}
                              alt={row.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">
                              No image
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-base font-semibold text-slate-900">
                            {row.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {row.brand ? (
                              <span className="font-medium uppercase tracking-wide text-slate-400">
                                {row.brand}
                              </span>
                            ) : null}
                            {row.sku && row.sku !== "-" ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                                {row.sku}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-400">
                              {row.variants} Variants
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${availabilityClass}`}
                        >
                          Stock: {row.stock}
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${statusClass}`}
                        >
                          {row.status.toString().toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">
                          {row.displayPrice}
                        </span>
                        <span className="truncate" title={row.category}>
                          {row.category}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p className="break-all" title={row.id}>
                          ID: {row.id}
                        </p>
                        <p>Added: {row.createdAt}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      {row.isFeatured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                          <Star size={12} /> Featured
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not featured
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleViewProduct(row)}
                          className="rounded-full border border-transparent p-2 transition hover:border-blue-100 hover:text-blue-600"
                          title="View product"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditProduct(row)}
                          className="rounded-full border border-transparent p-2 transition hover:border-blue-100 hover:text-blue-600"
                          title="Edit product"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(row)}
                          disabled={deletingId === row.id}
                          className="rounded-full border border-transparent p-2 transition hover:border-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Delete product"
                        >
                          {deletingId === row.id ? (
                            <Loader2
                              size={16}
                              className="animate-spin text-rose-500"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No products match your filters yet. Try creating a new listing to
              start selling.
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="pb-2">
              <table className="w-full table-auto text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all products"
                      />
                    </th>
                    <th className="px-4 py-4 text-left">Product</th>
                    <th className="px-4 py-4 text-left">ID</th>
                    <th className="px-4 py-4 text-left">Category</th>
                    <th className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => toggleSort("price")}
                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                      >
                        Price
                        <ArrowUpDown
                          size={14}
                          className={
                            sortConfig.field === "price"
                              ? "text-blue-500"
                              : "text-slate-300"
                          }
                        />
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left">Stock</th>
                    <th className="px-4 py-4 text-center">Featured</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="px-4 py-4 text-left">Added</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-slate-100">
                        {Array.from({ length: 10 }).map((__, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-4">
                            <span className="inline-block h-4 w-full max-w-[8rem] rounded bg-slate-100 animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : processedRows.length ? (
                    processedRows.map((row) => {
                      const availabilityClass =
                        availabilityBadge[row.availability] ||
                        "bg-slate-100 text-slate-500";
                      const statusClass =
                        statusBadge[row.status] ||
                        "bg-slate-100 text-slate-500";
                      const isSelected = selectedIds.has(row.id);

                      return (
                        <tr
                          key={row.id}
                          className="border-t border-slate-100 transition hover:bg-blue-50/40"
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                              checked={isSelected}
                              onChange={() => toggleRowSelection(row.id)}
                              aria-label={`Select ${row.name}`}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                {row.thumbnail ? (
                                  <img
                                    src={row.thumbnail}
                                    alt={row.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {row.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                  {row.brand ? (
                                    <span className="font-medium uppercase tracking-wide text-slate-400">
                                      {row.brand}
                                    </span>
                                  ) : null}
                                  {row.sku && row.sku !== "-" ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                                      {row.sku}
                                    </span>
                                  ) : null}
                                  <span className="text-[11px] text-slate-400">
                                    {row.variants} Variants
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className="block break-all text-xs font-medium text-slate-500"
                              title={row.id}
                            >
                              {row.id}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-slate-600">
                            <span
                              className="block truncate"
                              title={row.category}
                            >
                              {row.category}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {row.displayPrice}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${availabilityClass}`}
                            >
                              {row.stock}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {row.isFeatured ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                                <Star size={12} /> Featured
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                            >
                              {row.status.toString().toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {row.createdAt}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleViewProduct(row)}
                                className="rounded-full border border-transparent p-2 transition hover:border-blue-100 hover:text-blue-600"
                                title="View product"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditProduct(row)}
                                className="rounded-full border border-transparent p-2 transition hover:border-blue-100 hover:text-blue-600"
                                title="Edit product"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(row)}
                                disabled={deletingId === row.id}
                                className="rounded-full border border-transparent p-2 transition hover:border-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete product"
                              >
                                {deletingId === row.id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin text-rose-500"
                                  />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-16 text-center text-slate-500"
                      >
                        No products match your filters yet. Try creating a new
                        listing to start selling.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center">
          <span>
            {meta.total > 0
              ? `Showing ${
                  (meta.page - 1) * meta.limit + (products.length ? 1 : 0) || 1
                }-${(meta.page - 1) * meta.limit + products.length} of ${
                  meta.total
                }`
              : "No products to display"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loading}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 enabled:hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700">{page}</span>
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
        </footer>
      </div>

      {isClient &&
        createPortal(
          <AnimatePresence>
            {viewingProduct && (
              <motion.div
                className="fixed inset-0 z-50 bg-slate-900/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewingProduct(null)}
              >
                <div className="flex min-h-full items-center justify-center px-4 py-8">
                  <motion.div
                    initial={{ y: 32, opacity: 0, scale: 0.97 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 24, opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 220, damping: 26 }}
                    className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:my-0 max-h-[calc(100vh-4rem)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewingProduct(null)}
                      className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow hover:text-slate-800"
                      aria-label="Close product details"
                    >
                      <X size={18} />
                    </button>

                    <div className="h-full w-full overflow-y-auto px-6 pb-12 pt-10 pr-4 lg:px-12">
                      <div className="grid gap-6 lg:min-h-0 lg:grid-cols-[1.45fr,1fr] lg:gap-8">
                        <div className="space-y-6 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-3">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                                Product
                              </p>
                              <h2 className="text-2xl font-semibold text-slate-900">
                                {viewingProduct.name || "Untitled product"}
                              </h2>
                              <p className="text-sm text-slate-500">
                                ID: {viewingProduct._id || "--"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {resolveCategory(viewingProduct)}
                              </span>
                              {viewingProduct.createdAt ? (
                                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                                  <Calendar
                                    size={14}
                                    className="text-slate-400"
                                  />
                                  {new Date(
                                    viewingProduct.createdAt
                                  ).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                              <p className="text-xs text-slate-400">Price</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {formatCurrency(
                                  viewingProduct.price ||
                                    viewingProduct.originalPrice ||
                                    0
                                )}
                              </p>
                              {viewingProduct.originalPrice &&
                              Number(viewingProduct.originalPrice) >
                                Number(viewingProduct.price) ? (
                                <p className="text-xs text-slate-500">
                                  Original:{" "}
                                  {formatCurrency(viewingProduct.originalPrice)}
                                </p>
                              ) : null}
                            </div>
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                              <p className="text-xs text-slate-400">Stock</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {viewingProduct.stock ?? 0}
                              </p>
                              <p className="text-xs text-slate-500">
                                Availability:{" "}
                                {viewingProduct.availabilityStatus || "--"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                              <p className="text-xs text-slate-400">Status</p>
                              <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                                {viewingProduct.status || "--"}
                              </p>
                              <p className="flex items-center gap-2 text-xs text-slate-500">
                                <Star
                                  size={14}
                                  className={
                                    viewingProduct.isFeatured
                                      ? "text-sky-500"
                                      : "text-slate-300"
                                  }
                                />
                                Featured:{" "}
                                {viewingProduct.isFeatured ? "Yes" : "No"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                              <p className="text-xs text-slate-400">Discount</p>
                              <p className="mt-1 text-lg font-semibold text-slate-900">
                                {viewingProduct.discountPercentage
                                  ? `${viewingProduct.discountPercentage}% OFF`
                                  : "--"}
                              </p>
                              {viewingProduct.saveAmount ? (
                                <p className="text-xs text-slate-500">
                                  You save{" "}
                                  {formatCurrency(viewingProduct.saveAmount)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                Brand
                              </p>
                              <p className="mt-2 text-sm font-medium text-slate-700">
                                {viewingProduct.brand || "--"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                SKU
                              </p>
                              <p className="mt-2 break-all text-sm font-medium text-slate-700">
                                {viewingProduct.sku || "--"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                HSN Code
                              </p>
                              <p className="mt-2 text-sm font-medium text-slate-700">
                                {viewingProduct.hsnCode || "--"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                GST Rate
                              </p>
                              <p className="mt-2 text-sm font-medium text-slate-700">
                                {viewingProduct.gstRate !== undefined &&
                                viewingProduct.gstRate !== null
                                  ? `${viewingProduct.gstRate}%`
                                  : "--"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Description
                            </p>
                            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
                              {viewingProduct.description?.trim() ||
                                "No description provided yet."}
                            </p>
                          </div>

                          {Array.isArray(viewingProduct.keyFeatures) &&
                          viewingProduct.keyFeatures.some(
                            (feature) => feature && feature.trim().length
                          ) ? (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Key Features
                              </p>
                              <ul className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                {viewingProduct.keyFeatures
                                  .filter(
                                    (feature) =>
                                      feature && feature.trim().length
                                  )
                                  .map((feature, index) => (
                                    <li
                                      key={`${feature}-${index}`}
                                      className="flex items-start gap-2"
                                    >
                                      <Info
                                        size={16}
                                        className="mt-0.5 text-blue-500"
                                      />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          ) : null}

                          {Array.isArray(viewingProduct.sizes) &&
                          viewingProduct.showSizes &&
                          viewingProduct.sizes.length ? (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Variants
                              </p>
                              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 lg:grid-cols-2">
                                {viewingProduct.sizes.map((entry, index) => (
                                  <div
                                    key={`${entry?.label || index}-${
                                      entry?.stock || 0
                                    }`}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                                  >
                                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                      <Layers
                                        size={16}
                                        className="text-slate-400"
                                      />
                                      {entry?.label || "--"}
                                    </span>
                                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                                      <Package
                                        size={14}
                                        className="text-slate-300"
                                      />
                                      {entry?.isAvailable === false
                                        ? "Unavailable"
                                        : `${entry?.stock ?? 0} in stock`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                Rating
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">
                                {(
                                  viewingProduct.rating ??
                                  viewingProduct.ratings?.average ??
                                  0
                                ).toFixed?.(1) ?? 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase text-slate-400">
                                Reviews
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">
                                {viewingProduct.reviews ??
                                  viewingProduct.ratings?.totalReviews ??
                                  0}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <img
                              src={
                                viewingProduct.thumbnail ||
                                resolveThumbnail(viewingProduct) ||
                                viewingProduct.gallery?.[0] ||
                                "https://placehold.co/600x600/f8fafc/e2e8f0?text=Image"
                              }
                              alt={viewingProduct.name || "Product image"}
                              className="h-64 w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src =
                                  "https://placehold.co/600x600/f8fafc/e2e8f0?text=Image";
                              }}
                            />
                          </div>

                          {Array.isArray(viewingProduct.gallery) &&
                          viewingProduct.gallery.length > 1 ? (
                            <div className="space-y-2">
                              <p className="text-xs uppercase text-slate-400">
                                Gallery
                              </p>
                              <div className="grid grid-cols-3 gap-2">
                                {viewingProduct.gallery.map((image, index) => (
                                  <div
                                    key={`${image}-${index}`}
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                  >
                                    <img
                                      src={image}
                                      alt={`${
                                        viewingProduct.name || "Product"
                                      } ${index + 1}`}
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

                          <button
                            type="button"
                            onClick={() => {
                              if (viewingProduct?._id) {
                                setViewingProduct(null);
                                navigate(
                                  `/seller/products/${viewingProduct._id}`
                                );
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                          >
                            <Pencil size={16} />
                            Edit Product
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
};

export default SellerProducts;
