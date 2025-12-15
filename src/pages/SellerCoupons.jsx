import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchSellerCoupons } from "../utils/api";
import {
  Search,
  Filter,
  TicketPercent,
  AlertCircle,
  Loader2,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All coupons" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const columns = [
  { key: "code", label: "Code" },
  { key: "description", label: "Description" },
  { key: "discount", label: "Discount" },
  { key: "usageCount", label: "Used" },
  { key: "maxRedemptions", label: "Max Uses" },
  { key: "validity", label: "Validity" },
  { key: "status", label: "Status" },
];

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

const SellerCoupons = () => {
  const [coupons, setCoupons] = useState([]);
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
        const response = await fetchSellerCoupons({
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          isActive: status || undefined,
        });
        if (!isMounted) return;
        setCoupons(response?.data || []);
        setMeta(response?.meta || meta);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load coupons");
        setCoupons([]);
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
  }, [page, debouncedSearch, status]);

  const rows = useMemo(
    () =>
      coupons.map((coupon) => ({
        ...coupon,
        discount:
          coupon.discountType === "percentage"
            ? `${coupon.discountValue || 0}%`
            : formatCurrency(coupon.discountValue),
        validity:
          coupon.startDate || coupon.endDate
            ? `${formatDate(coupon.startDate)} – ${formatDate(coupon.endDate)}`
            : "No expiry",
        status: coupon.isActive ? "Active" : "Inactive",
      })),
    [coupons]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
            Promotions
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Coupons</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-inner">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search coupons"
              className="h-8 w-52 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
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
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <TicketPercent size={18} />
            Create Coupon
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[65vh] overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-5 py-4 text-left">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    {columns.map((column) => (
                      <td key={column.key} className="px-5 py-4">
                        <span className="inline-block h-4 w-full max-w-[12rem] rounded bg-slate-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row._id}
                    className="border-b border-slate-100 transition hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {row.code}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {row.description || "—"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-600">
                      {row.discount}
                    </td>
                    <td className="px-5 py-4">{row.usageCount || 0}</td>
                    <td className="px-5 py-4">{row.maxRedemptions || "∞"}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {row.validity}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          row.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    No coupons found. Create one to drive repeat purchases.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>
            {meta.total > 0
              ? `Showing ${
                  (meta.page - 1) * meta.limit + (coupons.length ? 1 : 0) || 1
                }-${(meta.page - 1) * meta.limit + coupons.length} of ${
                  meta.total
                }`
              : "No coupons to display"}
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
            <span className="font-semibold text-slate-700">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : page}
            </span>
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

export default SellerCoupons;
