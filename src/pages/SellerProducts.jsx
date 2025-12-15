import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
        const response = await fetchSellerProducts({
          page,
          limit: 20,
          search: debouncedSearch || undefined,
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
  }, [page, debouncedSearch, refreshToken]);

  const processedRows = useMemo(() => {
    const base = products.map((product) => {
      const numericPrice = Number(product.price) || 0;
      const availability = product.availabilityStatus || "unknown";
      const createdAt = product.createdAt || product.updatedAt;

      return {
        raw: product,
        id: product._id,
        name: product.name || "Unnamed product",
        sku: product.sku || "-",
        category: product.category || "-",
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
    let lowStock = 0;
    let outOfStock = 0;

    processedRows.forEach((entry) => {
      if (entry.availability === "low_stock") {
        lowStock += 1;
      }
      if (entry.availability === "out_of_stock") {
        outOfStock += 1;
      }
    });

    return {
      totalProducts,
      lowStock,
      outOfStock,
      selected: selectedIds.size,
    };
  }, [meta.total, processedRows, selectedIds.size]);

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
    if (!row?.id) {
      toast.error("Product information missing");
      return;
    }

    window.open(`/product/${row.id}`, "_blank", "noopener,noreferrer");
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
              placeholder="Search product name or ID"
              className="h-9 w-full bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toast("Date filter coming soon")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white hover:text-blue-600"
            >
              <CalendarRange size={16} /> Select Dates
            </button>
            <button
              type="button"
              onClick={() => toast("Advanced filters coming soon")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white hover:text-blue-600"
            >
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>
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

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all products"
                  />
                </th>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">ID</th>
                <th className="px-6 py-4 text-left">Category</th>
                <th className="px-6 py-4 text-left">Stock</th>
                <th className="px-6 py-4">
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
                <th className="px-6 py-4 text-center">Featured</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-left">Added</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-slate-100">
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4">
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
                    statusBadge[row.status] || "bg-slate-100 text-slate-500";
                  const isSelected = selectedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 transition hover:bg-blue-50/40"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">
                            {row.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {row.raw.variants?.length || 0} Variants
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {row.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">{row.category}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${availabilityClass}`}
                        >
                          {row.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {row.displayPrice}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.isFeatured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                            <Star size={12} /> Featured
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                        >
                          {row.status.toString().toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {row.createdAt}
                      </td>
                      <td className="px-6 py-4">
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

        <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
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
    </motion.div>
  );
};

export default SellerProducts;
