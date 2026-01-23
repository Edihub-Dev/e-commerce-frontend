import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
} from "lucide-react";
import SubadminSidebar from "../components/subadmin/SubadminSidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchSubadminSellerProducts,
  fetchSubadminSellerOrders,
  fetchSubadminSellerCoupons,
  updateSubadminOrderShipping,
} from "../services/subadminApi";
import { downloadOrderInvoice } from "../utils/api";

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

const SubadminSellerDetailsPage = () => {
  const { sellerId } = useParams();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("products");

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
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    courier: "Triupati",
    trackingId: "",
  });
  const [savingShipping, setSavingShipping] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState("");

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
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .some((value) => value.includes(query))
        : true;
      return matchesQuery;
    });
  }, [orders, ordersSearch]);

  const handleOpenEditShipping = (order) => {
    const defaultCourier =
      (order.shipping && order.shipping.courier) || "Triupati";
    const defaultTracking = order.shipping?.trackingId || "";

    setEditingOrder(order);
    setEditForm({ courier: defaultCourier, trackingId: defaultTracking });
  };

  const handleSaveShipping = async (event) => {
    event.preventDefault();
    if (!editingOrder) return;

    const orderKey =
      editingOrder.orderId || editingOrder.id || editingOrder._id;
    if (!orderKey) return;

    try {
      setSavingShipping(true);
      const payload = {
        courier: editForm.courier,
        trackingId: editForm.trackingId,
      };
      const updated = await updateSubadminOrderShipping(orderKey, payload);

      setOrders((prev) =>
        prev.map((order) => {
          const key = order.orderId || order.id || order._id;
          if (String(key) === String(orderKey)) {
            const nextShipping = updated.shipping || payload;
            return { ...order, shipping: nextShipping };
          }
          return order;
        }),
      );
      setEditingOrder(null);
    } catch (err) {
      console.error("Failed to update order shipping for subadmin", err);
      // surface minimal error
      window.alert(err.message || "Failed to update shipping details.");
    } finally {
      setSavingShipping(false);
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

  const primaryImage = resolveProductImage(viewProduct);
  const secondaryImages = collectAdditionalImages(viewProduct, primaryImage);

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <SubadminSidebar
          active="Dashboard"
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
                onClick={() => setActiveTab("products")}
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
                onClick={() => setActiveTab("orders")}
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
                onClick={() => setActiveTab("coupons")}
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
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Orders
                  </h2>
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
                        placeholder="Search by order id, buyer or tracking"
                        className="w-64 rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </header>

                {ordersError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {ordersError}
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-12">
                          S/N
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Order ID
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Customer
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Payment
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Total
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Courier
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Tracking
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
                            colSpan={9}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            Loading orders...
                          </td>
                        </tr>
                      ) : filteredOrders.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No orders found for this seller.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order, index) => {
                          const orderKey =
                            order.orderId || order.id || order._id;
                          const paymentStatus =
                            order.paymentStatus ||
                            order.payment?.status ||
                            "pending";
                          const totalAmount = resolveOrderTotal(order);
                          const courier = order.shipping?.courier || "Triupati";
                          const trackingId = order.shipping?.trackingId || "";
                          const customerName = resolveCustomerName(order);
                          const orderKeyString = String(orderKey || "");
                          const isDownloading =
                            downloadingInvoiceId === orderKeyString;

                          return (
                            <tr key={order._id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 align-middle text-center text-[11px] font-semibold text-slate-500">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 align-middle font-mono text-[11px] text-slate-800">
                                {orderKey}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {customerName}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {order.orderStatus ||
                                  order.status ||
                                  "processing"}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {paymentStatus}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-800">
                                {formatCurrency(totalAmount)}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {courier}
                              </td>
                              <td className="px-3 py-2 align-middle text-slate-700">
                                {trackingId || "--"}
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
                                      window.alert(
                                        `Order details view is read-only for subadmin. Order: ${orderKey}`,
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
                  <h2 className="text-lg font-semibold text-slate-900">
                    Coupons
                  </h2>
                  {couponsLoading && (
                    <p className="text-xs text-slate-500">Loading coupons...</p>
                  )}
                </header>
                {couponsError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {couponsError}
                  </div>
                )}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
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
                          Active
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {couponsLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            Loading coupons...
                          </td>
                        </tr>
                      ) : coupons.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No coupons found for this seller.
                          </td>
                        </tr>
                      ) : (
                        coupons.map((coupon) => (
                          <tr key={coupon._id} className="hover:bg-slate-50">
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
                              {coupon.isActive !== false ? "Yes" : "No"}
                            </td>
                          </tr>
                        ))
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
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Courier & Tracking
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Only courier name and tracking ID can be updated by subadmin.
              </p>
              <form
                onSubmit={handleSaveShipping}
                className="mt-4 space-y-4 text-sm"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Courier
                  </label>
                  <input
                    type="text"
                    value={editForm.courier}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        courier: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Tracking ID
                  </label>
                  <input
                    type="text"
                    value={editForm.trackingId}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        trackingId: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex justify-end pb-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingShipping}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingShipping ? "Saving..." : "Save"}
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
