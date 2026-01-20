import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
    [overview.metrics],
  );

  const statusBreakdown = useMemo(
    () => overview.statusBreakdown || emptyOverview.statusBreakdown,
    [overview.statusBreakdown],
  );

  const inventory = useMemo(
    () => overview.inventory || emptyOverview.inventory,
    [overview.inventory],
  );

  const topProducts = useMemo(
    () => overview.topProducts || emptyOverview.topProducts,
    [overview.topProducts],
  );

  const recentOrders = useMemo(
    () => overview.recentOrders || emptyOverview.recentOrders,
    [overview.recentOrders],
  );

  const metricCards = [
    {
      label: "Net Sales",
      value: formatCurrency(metrics.sales),
      icon: <BarChart3 size={22} />,
      accent: "bg-emerald-50 text-emerald-600",
      onClick: () => navigate("/seller/orders"),
    },
    {
      label: "Orders",
      value: formatNumber(metrics.orders),
      icon: <ShoppingBag size={22} />,
      accent: "bg-sky-50 text-sky-600",
      onClick: () => navigate("/seller/orders"),
    },
    {
      label: "Catalogue",
      value: formatNumber(metrics.products),
      icon: <PackageSearch size={22} />,
      accent: "bg-purple-50 text-purple-600",
      onClick: () => navigate("/seller/products"),
    },
    {
      label: "Active Coupons",
      value: formatNumber(metrics.coupons),
      icon: <TicketPercent size={22} />,
      accent: "bg-amber-50 text-amber-600",
      onClick: () =>
        navigate("/seller/coupons", {
          state: { status: "active" },
        }),
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
          <MetricCard
            key={card.label}
            {...card}
            isLoading={loading}
            className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
          />
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
                const statusFilter = key === "returned" ? "returned" : key;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate("/seller/orders", {
                        state: { status: statusFilter },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate("/seller/orders", {
                          state: { status: statusFilter },
                        });
                      }
                    }}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 cursor-pointer"
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
                {recentOrders.map((order) => {
                  const orderIdentifier =
                    order.orderId || order.id || order._id || "";
                  const createdDate = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "--";
                  const primaryItem = order.items?.[0] || {};
                  const productName =
                    primaryItem.productName ||
                    primaryItem.itemName ||
                    primaryItem.name ||
                    "Order";
                  const itemCount =
                    order.totalQuantity ??
                    order.totalItems ??
                    (Array.isArray(order.items) ? order.items.length : 0);
                  const customerName =
                    order.customerName ||
                    order.buyerName ||
                    order.shippingAddress?.fullName ||
                    "Customer";
                  const totalAmount = formatCurrency(
                    order.total ??
                      order.totalAmount ??
                      order.pricing?.total ??
                      0,
                  );
                  const statusConfig = statusChipConfig[order.status] || {
                    label: order.status || "Processing",
                    className:
                      "bg-slate-100 text-slate-600 border border-slate-200",
                  };

                  const handleNavigateToOrder = () => {
                    if (!orderIdentifier) {
                      return;
                    }
                    navigate(`/seller/orders/${orderIdentifier}`);
                  };

                  return (
                    <li
                      key={order.id || orderIdentifier}
                      role="button"
                      tabIndex={0}
                      onClick={handleNavigateToOrder}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNavigateToOrder();
                        }
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 cursor-pointer"
                    >
                      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(110px,150px)] sm:items-start sm:gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <span>{createdDate}</span>
                            {orderIdentifier && (
                              <span className="text-[10px] font-medium tracking-[0.12em] text-slate-600">
                                #{orderIdentifier}
                              </span>
                            )}
                          </div>
                          <p className="max-w-full truncate text-[10px] font-semibold leading-snug text-slate-900 sm:text-[11px] whitespace-nowrap">
                            {productName}
                          </p>
                          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <div className="flex w-full min-w-0 flex-col items-start gap-2 text-[11px] text-slate-500 sm:w-full sm:items-end sm:text-right sm:text-xs">
                          <p className="w-full truncate text-[12px] font-semibold text-slate-900 sm:text-right sm:text-sm">
                            {customerName}
                          </p>
                          <span
                            className={`inline-flex max-w-full items-center gap-2 truncate rounded-full px-3 py-[6px] text-[10px] font-semibold ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                          <strong className="text-[13px] font-semibold text-emerald-600 sm:text-sm">
                            {totalAmount}
                          </strong>
                        </div>
                      </div>
                    </li>
                  );
                })}
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
