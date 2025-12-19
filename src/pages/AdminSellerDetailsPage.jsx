import { useCallback, useEffect, useMemo, useState } from "react";
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
  X,
} from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchAdminSellers,
  fetchAdminSellerProducts,
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
import toast from "react-hot-toast";

const STATUS_LABELS = {
  published: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-600",
  },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-500" },
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
    `Are you sure you want to delete this ${entityLabel}${nameLabel}? This action cannot be undone.`
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
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
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
  const [productEdit, setProductEdit] = useState(null);
  const [productView, setProductView] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderEdit, setOrderEdit] = useState(null);
  const [orderView, setOrderView] = useState(null);

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsRefreshing, setCouponsRefreshing] = useState(false);
  const [couponsError, setCouponsError] = useState("");
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
        setProducts(Array.isArray(data) ? data : []);
        setProductsError("");
      } catch (error) {
        console.error("Failed to load seller products", error);
        setProductsError(error.message || "Unable to load seller products");
      } finally {
        setProductsLoading(false);
        setProductsRefreshing(false);
      }
    },
    [selectedSellerId]
  );

  const loadOrders = useCallback(
    async ({ silent } = { silent: false }) => {
      try {
        if (silent) {
          setOrdersRefreshing(true);
        } else {
          setOrdersLoading(true);
        }
        const params =
          selectedSellerId !== "all" ? { sellerId: selectedSellerId } : {};
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
    [selectedSellerId]
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
    [selectedSellerId]
  );

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadCoupons();
  }, [loadProducts, loadOrders, loadCoupons]);

  const filteredSellers = useMemo(() => {
    const query = sellerSearch.trim().toLowerCase();
    if (!query) return sellers;
    return sellers.filter((seller) =>
      [seller.name, seller.username, seller.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [sellers, sellerSearch]);

  const selectedSeller = useMemo(() => {
    if (selectedSellerId === "all") return null;
    return (
      sellers.find(
        (seller) => String(seller._id) === String(selectedSellerId)
      ) || null
    );
  }, [selectedSellerId, sellers]);

  const summaries = useMemo(() => {
    const totalSellers = sellers.length;
    const verifiedSellers = sellers.filter(
      (seller) => seller.isVerified
    ).length;
    const totalProducts = sellers.reduce(
      (acc, seller) => acc + (seller.metrics?.products || 0),
      0
    );
    const totalOrders = sellers.reduce(
      (acc, seller) => acc + (seller.metrics?.orders || 0),
      0
    );
    const totalCoupons = sellers.reduce(
      (acc, seller) => acc + (seller.metrics?.coupons || 0),
      0
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
            : seller
        )
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
        prev.filter((seller) => seller._id !== targetSeller._id)
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

  const handleProductUpdate = async (productId, updates) => {
    try {
      const updated = await updateAdminSellerProduct(productId, updates);
      toast.success("Product updated");
      setProducts((prev) =>
        prev.map((product) =>
          product._id === updated._id ? { ...product, ...updated } : product
        )
      );
      setProductEdit(null);
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to update seller product", error);
      toast.error(error.message || "Unable to update seller product");
    }
  };

  const handleProductDelete = async (productId) => {
    const product = products.find((item) => item._id === productId);
    const confirmed = confirmDeletion({
      entity: "product",
      name: product?.name || product?.sku || productId,
    });
    if (!confirmed) return;
    try {
      await deleteAdminSellerProduct(productId);
      toast.success("Product removed");
      setProducts((prev) =>
        prev.filter((product) => product._id !== productId)
      );
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to delete seller product", error);
      toast.error(error.message || "Unable to delete seller product");
    }
  };

  const handleOrderUpdate = async (orderId, updates) => {
    try {
      const updated = await updateAdminSellerOrder(orderId, updates);
      toast.success("Order updated");
      setOrders((prev) =>
        prev.map((order) =>
          order._id === updated._id ? { ...order, ...updated } : order
        )
      );
      setOrderEdit(null);
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to update seller order", error);
      toast.error(error.message || "Unable to update seller order");
    }
  };

  const handleOrderDelete = async (orderId) => {
    const order = orders.find((item) => item._id === orderId);
    const confirmed = confirmDeletion({
      entity: "order",
      name: order?.orderNumber || order?.orderId || orderId,
    });
    if (!confirmed) return;
    try {
      await deleteAdminSellerOrder(orderId);
      toast.success("Order removed");
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      await loadSellers({ silent: true });
    } catch (error) {
      console.error("Failed to delete seller order", error);
      toast.error(error.message || "Unable to delete seller order");
    }
  };

  const handleCouponUpdate = async (couponId, updates) => {
    try {
      const updated = await updateAdminSellerCoupon(couponId, updates);
      toast.success("Coupon updated");
      setCoupons((prev) =>
        prev.map((coupon) =>
          coupon._id === updated._id ? { ...coupon, ...updated } : coupon
        )
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
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setProductView(product)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                                  aria-label="View product"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProductEdit(product)}
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
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Order
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">
                          Seller
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
                      {orders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-slate-900">
                                {order.orderId}
                              </span>
                              <span className="text-xs text-slate-500">
                                {order.items?.length || 0} item(s)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-500">
                            {order.sellerId?.name ||
                              order.sellerId?.username ||
                              "Seller"}
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-500">
                            <div className="grid gap-1">
                              <span>
                                Revenue: {formatCurrency(order.totals?.revenue)}
                              </span>
                              <span>
                                Quantity: {order.totals?.quantity ?? 0}
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
                      ))}
                    </tbody>
                  </table>
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
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
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
                      {coupons.map((coupon) => (
                        <tr key={coupon._id} className="hover:bg-slate-50/50">
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
                                onClick={() => handleCouponDelete(coupon._id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                                aria-label="Delete coupon"
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
        isOpen={Boolean(productView)}
        title={productView ? productView.name : "Product"}
        onClose={() => setProductView(null)}
      >
        {productView ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              <p>SKU: {productView.sku}</p>
              <p>Price: {formatCurrency(productView.price)}</p>
              <p>Stock: {productView.stock ?? 0}</p>
              <p>Status: {productView.status}</p>
            </div>
            {productView.description ? (
              <div>
                <p className="text-xs uppercase text-slate-400">Description</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                  {productView.description}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </BaseModal>

      <BaseModal
        isOpen={Boolean(productEdit)}
        title={productEdit ? `Edit ${productEdit.name}` : "Edit product"}
        onClose={() => setProductEdit(null)}
        footer={
          <button
            type="button"
            onClick={() => {
              if (!productEdit) return;
              handleProductUpdate(productEdit._id, {
                price: Number(productEdit.price) || 0,
                stock: Number(productEdit.stock) || 0,
                status: productEdit.status,
                availabilityStatus: productEdit.availabilityStatus,
              });
            }}
            className="inline-flex items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Save Changes
          </button>
        }
      >
        {productEdit ? (
          <div className="space-y-3 text-sm text-slate-600">
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Price (INR)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={productEdit.price ?? ""}
                onChange={(event) =>
                  setProductEdit((prev) => ({
                    ...prev,
                    price: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Stock</span>
              <input
                type="number"
                min="0"
                value={productEdit.stock ?? ""}
                onChange={(event) =>
                  setProductEdit((prev) => ({
                    ...prev,
                    stock: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Status</span>
              <select
                value={productEdit.status}
                onChange={(event) =>
                  setProductEdit((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              >
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">Availability</span>
              <select
                value={productEdit.availabilityStatus || "in_stock"}
                onChange={(event) =>
                  setProductEdit((prev) => ({
                    ...prev,
                    availabilityStatus: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              >
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="preorder">Pre-order</option>
              </select>
            </label>
          </div>
        ) : null}
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
        onClose={() => setOrderEdit(null)}
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
            className="inline-flex items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Save Changes
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
          <div className="space-y-3 text-sm text-slate-600">
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
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-500">
                Minimum order (INR)
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
