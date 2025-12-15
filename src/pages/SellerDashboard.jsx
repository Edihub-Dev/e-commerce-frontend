import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  PackageSearch,
  ShoppingBag,
  TicketPercent,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import MetricCard from "../components/admin/MetricCard";
import { fetchSellerOverview } from "../utils/api";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const statusChipConfig = {
  processing: {
    label: "Processing",
    className: "bg-amber-50 text-amber-600 border border-amber-200",
  },
  shipped: {
    label: "Shipped",
    className: "bg-sky-50 text-sky-600 border border-sky-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  },
  returned: {
    label: "Returned",
    className: "bg-rose-50 text-rose-600 border border-rose-200",
  },
};

const emptyOverview = {
  metrics: {
    sales: 0,
    orders: 0,
    products: 0,
    coupons: 0,
  },
  statusBreakdown: {
    processing: 0,
    shipped: 0,
    delivered: 0,
    returned: 0,
  },
  inventory: {
    lowStock: 0,
    outOfStock: 0,
  },
  recentOrders: [],
  topProducts: [],
};

const SellerDashboard = () => {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchSellerOverview();
        if (!isMounted) return;
        const payload = response?.data || emptyOverview;
        setOverview({ ...emptyOverview, ...payload });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Unable to load dashboard");
        setOverview(emptyOverview);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(
    () => overview.metrics || emptyOverview.metrics,
    [overview.metrics]
  );

  const statusBreakdown = useMemo(
    () => overview.statusBreakdown || emptyOverview.statusBreakdown,
    [overview.statusBreakdown]
  );

  const inventory = useMemo(
    () => overview.inventory || emptyOverview.inventory,
    [overview.inventory]
  );

  const topProducts = useMemo(
    () => overview.topProducts || emptyOverview.topProducts,
    [overview.topProducts]
  );

  const recentOrders = useMemo(
    () => overview.recentOrders || emptyOverview.recentOrders,
    [overview.recentOrders]
  );

  const metricCards = [
    {
      label: "Net Sales",
      value: formatCurrency(metrics.sales),
      icon: <BarChart3 size={22} />,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Orders",
      value: formatNumber(metrics.orders),
      icon: <ShoppingBag size={22} />,
      accent: "bg-sky-50 text-sky-600",
    },
    {
      label: "Catalogue",
      value: formatNumber(metrics.products),
      icon: <PackageSearch size={22} />,
      accent: "bg-purple-50 text-purple-600",
    },
    {
      label: "Active Coupons",
      value: formatNumber(metrics.coupons),
      icon: <TicketPercent size={22} />,
      accent: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} isLoading={loading} />
        ))}
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Order Status Breakdown
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingUp size={16} />
                Last 5 orders
              </div>
            </header>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(statusBreakdown).map(([key, value]) => {
                const config = statusChipConfig[key] || {
                  label: key,
                  className:
                    "bg-slate-50 text-slate-600 border border-slate-200",
                };
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {config.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">
                      {loading ? (
                        <span className="inline-block h-6 w-16 rounded-lg bg-slate-200 animate-pulse" />
                      ) : (
                        formatNumber(value)
                      )}
                    </p>
                    <span
                      className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
                    >
                      <ArrowUpRight size={14} />
                      {value === 1 ? "Order" : "Orders"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Top Products
              </h2>
              <p className="text-xs text-slate-500">By revenue</p>
            </header>

            {loading ? (
              <div className="mt-6 space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-200 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded-full bg-slate-200 animate-pulse" />
                      <div className="h-3 w-28 rounded-full bg-slate-100 animate-pulse" />
                    </div>
                    <div className="h-4 w-16 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : topProducts.length ? (
              <ul className="mt-6 space-y-4">
                {topProducts.map((product) => (
                  <li
                    key={product.productId}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-100 hover:bg-blue-50"
                  >
                    <div className="h-12 w-12 flex-none overflow-hidden rounded-xl border border-white/10 bg-slate-900/60">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PackageSearch className="m-auto h-6 w-6 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.sku || "SKU unavailable"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(product.revenue)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatNumber(product.quantity)} units
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No product sales yet. Your top performers will appear here once
                orders start flowing in.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Inventory Watch
              </h2>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </header>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <span className="text-amber-600">Low stock</span>
                <span className="text-lg font-semibold text-amber-600">
                  {loading ? (
                    <span className="inline-block h-5 w-10 rounded bg-amber-200/70 animate-pulse" />
                  ) : (
                    formatNumber(inventory.lowStock)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <span className="text-rose-600">Out of stock</span>
                <span className="text-lg font-semibold text-rose-600">
                  {loading ? (
                    <span className="inline-block h-5 w-10 rounded bg-rose-200/70 animate-pulse" />
                  ) : (
                    formatNumber(inventory.outOfStock)
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Orders
              </h2>
              <p className="text-xs text-slate-500">Latest 5</p>
            </header>
            {loading ? (
              <div className="mt-6 space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="h-3 w-32 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-3 w-24 rounded-full bg-slate-100 animate-pulse" />
                    <div className="h-3 w-20 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length ? (
              <ul className="mt-6 space-y-3 text-sm">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                          statusChipConfig[order.status]?.className ||
                          "bg-white/10 text-slate-200 border border-white/10"
                        }`}
                      >
                        {statusChipConfig[order.status]?.label || order.status}
                      </span>
                    </div>
                    <p className="truncate text-base font-semibold text-slate-900">
                      {order.items?.[0]?.productName ||
                        order.items?.[0]?.itemName ||
                        "Order"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="text-slate-500">
                        {order.totalQuantity || 0} items
                      </span>
                      <strong className="text-emerald-600">
                        {formatCurrency(order.total)}
                      </strong>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Once you start receiving orders, a quick snapshot will show up
                here.
              </div>
            )}
          </div>
        </aside>
      </section>
    </motion.div>
  );
};

export default SellerDashboard;
