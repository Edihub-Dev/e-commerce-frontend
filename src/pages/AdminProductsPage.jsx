import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useId,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Download,
  Plus,
  Filter,
  Calendar as CalendarIcon,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  X,
  Star,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import ProductFormModal from "../components/admin/products/ProductFormModal";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAdminProductsThunk,
  updateAdminProductThunk,
  deleteAdminProductThunk,
} from "../store/thunks/adminProductsThunks";
import {
  setFilters,
  setSort,
  setPage,
  toggleSelectAll,
  toggleSelectRow,
  resetSelection,
} from "../store/slices/adminProductsSlice";

const statusBadgeClasses = {
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-300 text-slate-500",
};

const stockBadgeClasses = {
  in_stock: "bg-emerald-50 text-emerald-600",
  low_stock: "bg-amber-50 text-amber-600",
  out_of_stock: "bg-rose-50 text-rose-600",
  preorder: "bg-blue-50 text-blue-600",
};

const tableVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const statusOptions = [
  { label: "All Status", value: "" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const stockOptions = [
  { label: "All Stock", value: "" },
  { label: "In Stock", value: "in_stock" },
  { label: "Low Stock", value: "low_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "Preorder", value: "preorder" },
];

const FilterSelect = ({ label, value, onChange, options, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const labelId = useId();
  const listboxId = useId();

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];
  const fallbackLabel = selectedOption?.fallbackLabel;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      <span id={labelId}>{label}</span>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
            isOpen
              ? "border-blue-400 bg-white text-blue-600"
              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
          }`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${labelId} ${listboxId}`}
          aria-label={ariaLabel}
        >
          <span>{selectedOption?.label || fallbackLabel || label}</span>
          <ChevronDown
            size={14}
            className={`transition ${
              isOpen ? "rotate-180 text-blue-500" : "text-slate-400"
            }`}
          />
        </button>

        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <ul className="max-h-48 overflow-y-auto py-1">
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                      role="option"
                      aria-selected={isActive}
                    >
                      {option.label || option.fallbackLabel || label}
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase text-blue-500">
                          Selected
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, meta, filters, sort, status, error, selection } =
    useAppSelector((state) => state.adminProducts);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search || "");
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [formError, setFormError] = useState("");
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const { user, logout } = useAuth();
  const [categoryCache, setCategoryCache] = useState([]);

  useEffect(() => {
    setCategoryCache((previous) => {
      const nextSet = new Set(previous);
      items.forEach((product) => {
        if (product?.category) {
          nextSet.add(product.category);
        }
      });
      if (filters.category) {
        nextSet.add(filters.category);
      }
      const sorted = Array.from(nextSet).sort((a, b) => a.localeCompare(b));
      const hasChanged =
        sorted.length !== previous.length ||
        sorted.some((value, index) => value !== previous[index]);
      return hasChanged ? sorted : previous;
    });
  }, [items, filters.category]);

  const categoryOptions = useMemo(
    () => ["", ...categoryCache],
    [categoryCache]
  );

  const filterDropdowns = useMemo(() => {
    const buildOptions = (entries, appendAllLabel) =>
      entries.map((entry) => {
        if (typeof entry === "string") {
          return {
            value: entry,
            label: entry || appendAllLabel,
          };
        }
        return entry;
      });

    return {
      categories: buildOptions(categoryOptions, "All Categories"),
      statuses: buildOptions(statusOptions, "All Status"),
      stocks: buildOptions(stockOptions, "All Stock"),
    };
  }, [categoryOptions]);

  const queryParams = useMemo(() => {
    const params = {
      page: meta.page,
      limit: meta.limit,
      sortBy: sort.field,
      sortOrder: sort.order,
    };

    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    if (filters.stockStatus) params.stockStatus = filters.stockStatus;
    if (filters.category) params.category = filters.category;
    if (filters.dateRange.startDate)
      params.startDate = filters.dateRange.startDate;
    if (filters.dateRange.endDate) params.endDate = filters.dateRange.endDate;
    return params;
  }, [filters, meta.limit, meta.page, sort.field, sort.order]);

  useEffect(() => {
    dispatch(fetchAdminProductsThunk(queryParams));
  }, [dispatch, queryParams]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchDraft(value);
    dispatch(setFilters({ search: value }));
  };

  const handleExport = () => {
    if (!items.length) {
      toast.error("No products to export");
      return;
    }

    try {
      const headers = [
        "Name",
        "ID",
        "Category",
        "Brand",
        "Price",
        "Original Price",
        "Discount %",
        "Stock",
        "Availability",
        "Status",
      ];

      const rows = items.map((product) => {
        const price = Number(product.price ?? 0);
        const originalPrice = Number(
          product.originalPrice ?? product.price ?? 0
        );
        const discount = Number(product.discountPercentage ?? 0);

        return [
          product.name || "",
          product._id || "",
          product.category || "",
          product.brand || "",
          price.toString(),
          originalPrice.toString(),
          discount.toString(),
          (product.stock ?? 0).toString(),
          product.availabilityStatus || "",
          product.status || "",
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      if (typeof window === "undefined") {
        toast.error("Export is only available in the browser");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `products_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Exported products as CSV");
    } catch (exportError) {
      console.error("Failed to export products", exportError);
      toast.error("Failed to export products");
    }
  };

  const handleSortToggle = (field) => {
    const isSameField = sort.field === field;
    const nextOrder = isSameField && sort.order === "asc" ? "desc" : "asc";
    dispatch(setSort({ field, order: nextOrder }));
  };

  const handleSelectAll = (event) => {
    dispatch(toggleSelectAll({ selectAll: event.target.checked }));
  };

  const handleSelectRow = (id) => {
    dispatch(toggleSelectRow({ id }));
  };

  const handlePageChange = (page) => {
    dispatch(setPage(page));
  };

  const handleCategoryChange = (nextValue) => {
    dispatch(setFilters({ category: nextValue }));
  };

  const handleStatusChange = (nextValue) => {
    dispatch(setFilters({ status: nextValue }));
  };

  const handleStockChange = (nextValue) => {
    dispatch(setFilters({ stockStatus: nextValue }));
  };

  const handleDateChange = (field, value) => {
    dispatch(
      setFilters({
        dateRange: {
          ...filters.dateRange,
          [field]: value,
        },
      })
    );
  };

  const handleClearFilters = () => {
    dispatch(
      setFilters({
        search: "",
        category: "",
        status: "",
        stockStatus: "",
        dateRange: { startDate: "", endDate: "" },
      })
    );
    setSearchDraft("");
  };

  useEffect(() => {
    return () => {
      dispatch(resetSelection());
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const shouldLock = modalOpen || Boolean(viewProduct);
    if (!shouldLock) {
      return undefined;
    }

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [modalOpen, viewProduct]);

  const isLoading = status === "loading";
  const isEmpty = !isLoading && items.length === 0;

  const modalInitialData = useMemo(() => {
    if (!activeProduct) {
      return null;
    }

    const resolveUrl = (value) => {
      if (!value || typeof value !== "string") {
        return value;
      }

      if (value.startsWith("http")) {
        return value;
      }

      return `${
        import.meta.env.VITE_S3_PUBLIC_URL ||
        "https://s3.ap-south-1.amazonaws.com/ecom-mega-mart"
      }/${value.replace(/^\/+/, "")}`;
    };

    const gallery = Array.isArray(activeProduct.gallery)
      ? activeProduct.gallery
      : Array.isArray(activeProduct.images)
      ? activeProduct.images
      : [];

    return {
      name: activeProduct.name || "",
      sku: activeProduct.sku || activeProduct.id || "",
      category: activeProduct.category || "",
      categoryPriority: activeProduct.categoryPriority || "P5",
      brand: activeProduct.brand || "",
      price: activeProduct.price ?? "",
      originalPrice: activeProduct.originalPrice ?? "",
      discountPercentage: activeProduct.discountPercentage ?? "",
      saveAmount: activeProduct.saveAmount ?? "",
      hsnCode: activeProduct.hsnCode ?? "",
      gstRate:
        activeProduct.gstRate !== undefined && activeProduct.gstRate !== null
          ? activeProduct.gstRate
          : "",
      rating: activeProduct.rating ?? activeProduct.ratings?.average ?? "",
      reviews:
        activeProduct.reviews ?? activeProduct.ratings?.totalReviews ?? "",
      stock: activeProduct.stock ?? "",
      status: activeProduct.status || "published",
      availabilityStatus: activeProduct.availabilityStatus || "in_stock",
      thumbnail: resolveUrl(
        activeProduct.thumbnail ||
          activeProduct.image ||
          activeProduct.imageUrl ||
          ""
      ),
      description: activeProduct.description || "",
      gallery: gallery.map((entry) => resolveUrl(entry)),
      isFeatured: Boolean(activeProduct.isFeatured),
      keyFeatures: Array.isArray(activeProduct.keyFeatures)
        ? activeProduct.keyFeatures
        : [],
      sizes: Array.isArray(activeProduct.sizes)
        ? activeProduct.sizes.map((size) => ({
            label: size?.label ?? "",
            isAvailable: Boolean(size?.isAvailable ?? true),
            stock: Math.max(Number(size?.stock ?? 0), 0),
          }))
        : [],
      showSizes: Boolean(activeProduct.showSizes),
    };
  }, [activeProduct]);

  const closeModal = () => {
    setModalOpen(false);
    setActiveProduct(null);
    setFormError("");
  };

  const openAddModal = () => {
    navigate("/admin/products/new");
  };

  const openEditModal = (product) => {
    setActiveProduct(product);
    setFormError("");
    setModalOpen(true);
  };

  const handleViewProduct = (product) => {
    setViewProduct(product);
  };

  const closeViewProduct = () => {
    setViewProduct(null);
  };

  const handleSubmitProduct = async (values) => {
    if (!activeProduct?._id) {
      return;
    }

    setIsSubmittingProduct(true);
    setFormError("");
    try {
      await dispatch(
        updateAdminProductThunk({ id: activeProduct._id, payload: values })
      ).unwrap();
      toast.success("Product updated successfully.");
      closeModal();
    } catch (submitError) {
      const message =
        submitError?.message ||
        submitError ||
        "Unable to save product. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Delete product "${product.name}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    try {
      await dispatch(deleteAdminProductThunk(product._id)).unwrap();
      toast.success("Product deleted successfully.");
    } catch (deleteError) {
      const message =
        deleteError?.message ||
        deleteError ||
        "Failed to delete product. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <Sidebar
          active="Products"
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
                  active="Products"
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
            activeRange="All Date"
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
                <p className="text-sm text-slate-500">Dashboard / Products</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Products
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 sm:w-auto"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/admin/products/new")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
                >
                  <Plus size={16} />
                  Add Product
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-400">
                  Total Products
                </p>
                <p className="mt-2 text-2xl font-semibold">{meta.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-400">Low Stock</p>
                <p className="mt-2 text-2xl font-semibold text-amber-600">
                  {meta.counts?.lowStock ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-400">Out of Stock</p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                  {meta.counts?.outOfStock ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-400">Selected</p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">
                  {selection.selectedIds.length}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 lg:flex-1 lg:flex-row lg:items-center">
                  <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <Search size={16} className="text-slate-400" />
                    <input
                      value={searchDraft}
                      onChange={handleSearchChange}
                      placeholder="Search product name or ID"
                      className="w-full bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 sm:w-auto"
                      onClick={() => setShowDatePicker((prev) => !prev)}
                    >
                      <CalendarIcon size={16} />
                      Select Dates
                    </button>
                    {showDatePicker && (
                      <div className="absolute left-0 z-20 mt-2 w-full min-w-[16rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:w-64">
                        <div className="flex flex-col gap-3 text-sm">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-slate-500">
                              Start Date
                            </span>
                            <input
                              type="date"
                              value={filters.dateRange.startDate}
                              onChange={(event) =>
                                handleDateChange(
                                  "startDate",
                                  event.target.value
                                )
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
                              value={filters.dateRange.endDate}
                              onChange={(event) =>
                                handleDateChange("endDate", event.target.value)
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium transition sm:w-auto ${
                      showFilters
                        ? "border-blue-200 text-blue-600"
                        : "text-slate-600 hover:border-blue-200 hover:text-blue-600"
                    }`}
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    <Filter size={16} />
                    Filters
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-3 grid gap-3 md:grid-cols-4"
                  >
                    <FilterSelect
                      label="Category"
                      value={filters.category}
                      onChange={handleCategoryChange}
                      options={filterDropdowns.categories}
                      ariaLabel="Filter products by category"
                    />
                    <FilterSelect
                      label="Status"
                      value={filters.status}
                      onChange={handleStatusChange}
                      options={filterDropdowns.statuses}
                      ariaLabel="Filter products by status"
                    />
                    <FilterSelect
                      label="Stock Status"
                      value={filters.stockStatus}
                      onChange={handleStockChange}
                      options={filterDropdowns.stocks}
                      ariaLabel="Filter products by stock status"
                    />
                    <div className="flex flex-col items-end md:flex-row md:items-center md:justify-end">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 md:w-auto"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative mt-4 hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selection.allSelected}
                          onChange={handleSelectAll}
                          aria-label="Select all products"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        id
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-semibold text-slate-500"
                          onClick={() => handleSortToggle("price")}
                        >
                          Price
                          <ArrowUpDown size={14} />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Featured
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Added
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <AnimatePresence>
                      {isLoading && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            <div className="inline-flex items-center gap-2 text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading products...
                            </div>
                          </td>
                        </tr>
                      )}

                      {!isLoading && error && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-6 py-10 text-center text-rose-600"
                          >
                            {error}
                          </td>
                        </tr>
                      )}

                      {isEmpty && !error && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            No products found. Try adjusting your filters.
                          </td>
                        </tr>
                      )}

                      {!isLoading &&
                        !error &&
                        items.map((product) => {
                          const statusClass =
                            statusBadgeClasses[product.status] ||
                            statusBadgeClasses.published;
                          const stockClass =
                            stockBadgeClasses[product.availabilityStatus] ||
                            stockBadgeClasses.in_stock;
                          const price = Number(
                            product.price || 0
                          ).toLocaleString("en-IN", {
                            style: "currency",
                            currency: product.currency || "INR",
                            minimumFractionDigits: 2,
                          });
                          const createdAt = product.createdAt
                            ? new Date(product.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "--";

                          return (
                            <motion.tr
                              key={product._id}
                              initial="hidden"
                              animate="visible"
                              variants={tableVariants}
                              className="hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={selection.selectedIds.includes(
                                    product._id
                                  )}
                                  onChange={() => handleSelectRow(product._id)}
                                  aria-label={`Select ${product.name}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                    <img
                                      src={
                                        product.thumbnail || product.imageUrl
                                      }
                                      alt={product.name}
                                      className="h-full w-full object-cover"
                                      onError={(event) => {
                                        event.currentTarget.src =
                                          "https://placehold.co/96x96/f8fafc/e2e8f0?text=IMG";
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {product.variants?.length || 0} Variants
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {product._id || "--"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {product.category || "--"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${stockClass}`}
                                >
                                  {product.stock ?? 0}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                {price}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    product.isFeatured
                                      ? "bg-blue-50 text-blue-600"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <Star
                                    size={12}
                                    className={
                                      product.isFeatured
                                        ? "text-blue-500 fill-blue-400"
                                        : "text-slate-400"
                                    }
                                  />
                                  {product.isFeatured ? "Featured" : "Standard"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                                >
                                  {product.status
                                    ? product.status.charAt(0).toUpperCase() +
                                      product.status.slice(1)
                                    : "Published"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">
                                {createdAt}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2 text-slate-400">
                                  <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent hover:border-blue-200 hover:text-blue-600"
                                    aria-label="View product"
                                    onClick={() => handleViewProduct(product)}
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent hover:border-blue-200 hover:text-blue-600"
                                    aria-label="Edit product"
                                    onClick={() => openEditModal(product)}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent hover:border-rose-200 hover:text-rose-600"
                                    aria-label="Delete product"
                                    onClick={() => handleDeleteProduct(product)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-3 md:hidden">
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
                        Loading products...
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

                  {isEmpty && !error && (
                    <motion.div
                      className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      No products found. Try adjusting your filters.
                    </motion.div>
                  )}

                  {!isLoading &&
                    !error &&
                    items.map((product) => {
                      const statusClass =
                        statusBadgeClasses[product.status] ||
                        statusBadgeClasses.published;
                      const stockClass =
                        stockBadgeClasses[product.availabilityStatus] ||
                        stockBadgeClasses.in_stock;
                      const price = Number(product.price || 0).toLocaleString(
                        "en-IN",
                        {
                          style: "currency",
                          currency: product.currency || "INR",
                          minimumFractionDigits: 2,
                        }
                      );
                      const createdAt = product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "--";

                      return (
                        <motion.div
                          key={product._id}
                          className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={selection.selectedIds.includes(
                                  product._id
                                )}
                                onChange={() => handleSelectRow(product._id)}
                                aria-label={`Select ${product.name}`}
                              />
                              <div className="flex items-center gap-3">
                                <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                  <img
                                    src={product.thumbnail || product.imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                    onError={(event) => {
                                      event.currentTarget.src =
                                        "https://placehold.co/96x96/f8fafc/e2e8f0?text=IMG";
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    ID: {product._id || "--"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <span
                              className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                            >
                              {product.status
                                ? product.status.charAt(0).toUpperCase() +
                                  product.status.slice(1)
                                : "Published"}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-2 text-sm text-slate-600">
                            <div className="flex justify-between">
                              <span className="text-xs uppercase text-slate-400">
                                Category
                              </span>
                              <span className="font-medium">
                                {product.category || "--"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs uppercase text-slate-400">
                                Price
                              </span>
                              <span className="font-semibold text-slate-900">
                                {price}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs uppercase text-slate-400">
                                Featured
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                                  product.isFeatured
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <Star
                                  size={12}
                                  className={
                                    product.isFeatured
                                      ? "text-blue-500 fill-blue-400"
                                      : "text-slate-400"
                                  }
                                />
                                {product.isFeatured ? "Yes" : "No"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs uppercase text-slate-400">
                                Stock
                              </span>
                              <span
                                className={`inline-flex min-w-[64px] items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${stockClass}`}
                              >
                                {product.stock ?? 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs uppercase text-slate-400">
                                Added
                              </span>
                              <span>{createdAt}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                              onClick={() => handleViewProduct(product)}
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                              onClick={() => openEditModal(product)}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:border-rose-300"
                              onClick={() => handleDeleteProduct(product)}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>

              {!isLoading && !isEmpty && !error && (
                <div className="flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing {(meta.page - 1) * meta.limit + 1}-
                    {Math.min(meta.page * meta.limit, meta.total)} of{" "}
                    {meta.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-50"
                      disabled={meta.page === 1}
                      onClick={() => handlePageChange(meta.page - 1)}
                    >
                      Prev
                    </button>
                    {Array.from(
                      { length: meta.totalPages },
                      (_, index) => index + 1
                    ).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => handlePageChange(pageNumber)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                          pageNumber === meta.page
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-50"
                      disabled={meta.page >= meta.totalPages}
                      onClick={() => handlePageChange(meta.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <ProductFormModal
        isOpen={modalOpen}
        mode="edit"
        initialData={modalInitialData}
        onClose={closeModal}
        onSubmit={handleSubmitProduct}
        isSubmitting={isSubmittingProduct}
        error={formError}
      />

      <AnimatePresence>
        {viewProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 py-8 md:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl md:my-0 max-h-[calc(100vh-4rem)] overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              <button
                type="button"
                onClick={closeViewProduct}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-6 px-6 pb-6 pt-12 md:grid-cols-[1.2fr,1fr]">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase text-slate-400">
                          Product
                        </p>
                        <h2 className="text-xl font-semibold text-slate-900">
                          {viewProduct.name || "Untitled product"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          ID: {viewProduct._id || "--"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {viewProduct.category || "No category"}
                      </span>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-xs text-slate-400">Price</p>
                          <p className="text-base font-semibold text-slate-900">
                            ₹
                            {Number(viewProduct.price ?? 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-xs text-slate-400">Stock</p>
                          <p className="text-base font-semibold text-slate-900">
                            {viewProduct.stock ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-xs text-slate-400">Availability</p>
                          <p className="text-base font-semibold text-slate-900">
                            {viewProduct.availabilityStatus || "--"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-xs text-slate-400">Status</p>
                          <p className="text-base font-semibold text-slate-900">
                            {viewProduct.status || "--"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                          <p className="text-xs text-slate-400">Featured</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                            <Star
                              size={14}
                              className={
                                viewProduct.isFeatured
                                  ? "text-blue-500 fill-blue-400"
                                  : "text-slate-300"
                              }
                            />
                            {viewProduct.isFeatured ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-white p-4 shadow-sm">
                          <p className="text-xs uppercase text-slate-400">
                            Brand
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {viewProduct.brand || "--"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm">
                          <p className="text-xs uppercase text-slate-400">
                            Discount
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {Number(viewProduct.discountPercentage ?? 0)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase text-slate-400">
                        Description
                      </p>
                      <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
                        {viewProduct.description || "No description provided."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase text-slate-400">
                        Metadata
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Rating
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {Number(viewProduct.rating ?? 0).toFixed(1)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Reviews
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-900">
                            {viewProduct.reviews ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={
                          viewProduct.thumbnail ||
                          viewProduct.imageUrl ||
                          viewProduct.gallery?.[0] ||
                          "https://placehold.co/600x600/f8fafc/e2e8f0?text=Image"
                        }
                        alt={viewProduct.name}
                        className="h-64 w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src =
                            "https://placehold.co/600x600/f8fafc/e2e8f0?text=Image";
                        }}
                      />
                    </div>

                    {Array.isArray(viewProduct.gallery) &&
                      viewProduct.gallery.length > 1 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase text-slate-400">
                            Gallery
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {viewProduct.gallery.map((image, index) => (
                              <div
                                key={`${image}-${index}`}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                              >
                                <img
                                  src={image}
                                  alt={`${viewProduct.name || "Product"} ${
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
                      )}

                    <button
                      type="button"
                      onClick={() => {
                        closeViewProduct();
                        openEditModal(viewProduct);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      <Pencil size={16} />
                      Edit Product
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProductsPage;
