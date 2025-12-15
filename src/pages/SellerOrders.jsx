import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchSellerOrders } from "../utils/api";
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
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
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

const SellerOrders = () => {
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
  const [status, setStatus] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
        const response = await fetchSellerOrders({
          page,
          limit: 10,
          status: status || undefined,
          search: debouncedSearch || undefined,
        });
        if (!isMounted) return;
        setOrders(response?.data || []);
        setMeta(response?.meta || meta);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load orders");
        setOrders([]);
        setMeta((prev) => ({ ...prev, total: 0, totalPages: 1 }));
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
  }, [page, status, debouncedSearch]);

  const orderCards = useMemo(() => orders, [orders]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
            Fulfilment
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-inner">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search orders"
              className="h-8 w-48 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">
            <Filter size={16} className="text-slate-400" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-white"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : orderCards.length ? (
          orderCards.map((order) => {
            const statusClass =
              statusBadgeClasses[order.status] ||
              "bg-slate-50 text-slate-600 border border-slate-200";
            return (
              <div
                key={order.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">
                      Order #{order.orderId}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    <Truck size={14} />
                    {order.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Buyer
                    </p>
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        {order.buyerEmail || "-"}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        {order.buyerPhone || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Order summary
                    </p>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                      <span className="text-slate-500">Total</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {order.totalQuantity || 0} items across{" "}
                      {order.items?.length || 0} products
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Items
                  </p>
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={`${order.id}-${item.productId || index}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
                            <Package size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.productName || item.itemName || "Product"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Qty: {item.quantity || 0} •{" "}
                              {formatCurrency(item.price || 0)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(
                            (item.price || 0) * (item.quantity || 0)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No orders match your current filters.
          </div>
        )}
      </div>

      <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span>
          {meta.total > 0
            ? `Showing ${
                (meta.page - 1) * meta.limit + (orders.length ? 1 : 0) || 1
              }-${(meta.page - 1) * meta.limit + orders.length} of ${
                meta.total
              }`
            : "No orders to display"}
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
    </motion.div>
  );
};

export default SellerOrders;
