import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import DashboardHeader from "../components/admin/DashboardHeader";
import RecentOrdersTable from "../components/admin/RecentOrdersTable";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_ORDER_FILTERS = {
  status: "",
  startDate: "",
  endDate: "",
};

const createRecent24HourFilters = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  return {
    status: "",
    startDate: formatDateInput(start),
    endDate: formatDateInput(now),
  };
};

const formatDateInput = (date) => date.toISOString().slice(0, 10);

const mapStatusForBreakdown = (status = "processing") => {
  const normalized = String(status).toLowerCase();
  if (["confirmed"].includes(normalized)) return "processing";
  if (["shipped", "out_for_delivery"].includes(normalized)) return "shipped";
  if (["delivered"].includes(normalized)) return "delivered";
  if (["returned"].includes(normalized)) return "returned";
  return "processing";
};

const computeStatusBreakdown = (orders = []) => {
  const base = { processing: 0, shipped: 0, delivered: 0, returned: 0 };
  orders.forEach((order) => {
    const key = mapStatusForBreakdown(order.status);
    if (base[key] !== undefined) {
      base[key] += 1;
    }
  });
  return base;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [metrics, setMetrics] = useState({
    sales: 0,
    orders: 0,
    profit: 0,
    customers: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState({
    processing: 0,
    shipped: 0,
    delivered: 0,
    returned: 0,
  });
  const [notifications, setNotifications] = useState({
    pendingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
  });
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [activeRange, setActiveRange] = useState("24 Hour");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderFilters, setOrderFilters] = useState(() =>
    createRecent24HourFilters()
  );
  const [orderFiltersDraft, setOrderFiltersDraft] = useState(() =>
    createRecent24HourFilters()
  );
  const { user, logout } = useAuth();

  const appliedFiltersSummary = useMemo(
    () => ({ ...orderFilters }),
    [orderFilters]
  );

  const handleUserUpdated = (updatedUser) => {
    if (updatedUser.__delete) {
      setUsers((prev) => prev.filter((usr) => usr._id !== updatedUser._id));
      return;
    }

    if (updatedUser.__bulkDelete && Array.isArray(updatedUser.deletedIds)) {
      setUsers((prev) =>
        prev.filter((usr) => !updatedUser.deletedIds.includes(usr._id))
      );
      return;
    }

    setUsers((prev) =>
      prev.map((usr) =>
        usr._id === updatedUser._id ? { ...usr, ...updatedUser } : usr
      )
    );
  };

  const handleDraftFilterChange = (changes) => {
    setOrderFiltersDraft((prev) => ({ ...prev, ...changes }));
  };

  const applyOrderFilters = () => {
    setOrderFilters({ ...orderFiltersDraft });
  };

  const clearOrderFilters = () => {
    setOrderFiltersDraft({ ...DEFAULT_ORDER_FILTERS });
    setOrderFilters({ ...DEFAULT_ORDER_FILTERS });
    setActiveRange("All Date");
  };

  const handleRangeSelect = (range) => {
    setActiveRange(range);

    if (range === "All Date") {
      setOrderFiltersDraft((prev) => ({ ...prev, startDate: "", endDate: "" }));
      setOrderFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
      return;
    }

    const now = new Date();
    let start;

    switch (range) {
      case "12 Months":
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "30 Days":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case "7 Days":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case "24 Hour":
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        break;
      default:
        start = null;
        break;
    }

    const updates = {
      startDate: start ? formatDateInput(start) : "",
      endDate: formatDateInput(now),
    };

    setOrderFiltersDraft((prev) => ({ ...prev, ...updates }));
    setOrderFilters((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    let isSubscribed = true;

    const fetchOverview = async () => {
      if (!isSubscribed) return;
      setOverviewLoading(true);
      try {
        const response = await api.get("/admin/overview");

        if (!isSubscribed) return;

        if (response.data?.success) {
          const data = response.data.data || {};
          setMetrics(data.metrics || {});
          setNotifications(data.notifications || {});
          setStatusBreakdown({
            ...computeStatusBreakdown(data.recentOrders || []),
            ...(data.statusBreakdown || {}),
          });
          setOverviewError("");
        } else {
          setOverviewError(
            response.data?.message || "Unable to load admin overview."
          );
        }
      } catch (error) {
        if (!isSubscribed) return;
        console.error("Failed to load admin overview", error);
        setOverviewError("Unable to load admin overview. Please try again.");
      } finally {
        if (isSubscribed) {
          setOverviewLoading(false);
        }
      }
    };

    const fetchUsers = async () => {
      if (!isSubscribed) return;
      setUsersLoading(true);
      try {
        const response = await api.get("/admin/users");
        if (!isSubscribed) return;
        const allUsers = response.data?.data || [];
        const filteredUsers = allUsers.filter((usr) => {
          const normalizedRole = String(usr.role).toLowerCase();
          return normalizedRole === "customer" || normalizedRole === "admin";
        });
        setUsers(filteredUsers);
        setUsersError("");
      } catch (error) {
        if (!isSubscribed) return;
        console.error("Failed to load users", error);
        setUsersError("Unable to load users. Please try again.");
      } finally {
        if (isSubscribed) {
          setUsersLoading(false);
        }
      }
    };

    fetchOverview();
    fetchUsers();

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const fetchOrders = async () => {
      if (!isSubscribed) return;
      setOrdersLoading(true);
      try {
        const params = { excludeSellerOrders: true };
        if (orderFilters.status) params.status = orderFilters.status;
        if (orderFilters.startDate) params.startDate = orderFilters.startDate;
        if (orderFilters.endDate) params.endDate = orderFilters.endDate;

        const response = await api.get("/orders", {
          params,
        });

        if (!isSubscribed) return;

        const fetchedOrders = response.data?.data || [];
        setOrders(fetchedOrders);
        setStatusBreakdown((prev) => ({
          ...prev,
          ...computeStatusBreakdown(fetchedOrders),
        }));
        setOrdersError("");
      } catch (error) {
        if (!isSubscribed) return;
        console.error("Failed to fetch orders", error);
        setOrdersError("Unable to load orders. Please try again shortly.");
      } finally {
        if (isSubscribed) {
          setOrdersLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isSubscribed = false;
    };
  }, [orderFilters]);

  useEffect(() => {
    const html = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyHeight = document.body.style.height;
    const previousHtmlHeight = html.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    html.style.overflow = "hidden";
    html.style.height = "100vh";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
      html.style.overflow = previousHtmlOverflow;
      html.style.height = previousHtmlHeight;
    };
  }, []);

  const handleOrderDeleted = useCallback((orderId) => {
    setOrders((prev) => {
      const updated = prev.filter((order) => order._id !== orderId);
      setStatusBreakdown((prevBreakdown) => ({
        ...prevBreakdown,
        ...computeStatusBreakdown(updated),
      }));
      setMetrics((prevMetrics) => ({ ...prevMetrics, orders: updated.length }));
      return updated;
    });
  }, []);

  const handleOrderUpdated = useCallback((updatedOrder) => {
    setOrders((prev) => {
      const updated = prev.map((order) =>
        order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order
      );
      setStatusBreakdown((prevBreakdown) => ({
        ...prevBreakdown,
        ...computeStatusBreakdown(updated),
      }));
      return updated;
    });
  }, []);

  return (
    <div className="h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <div className="flex h-full">
        <Sidebar
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
                <Sidebar
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

        <div className="flex flex-1 flex-col h-full overflow-hidden">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            activeRange={activeRange}
            onSelectRange={handleRangeSelect}
            adminName={user?.name || user?.username}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            notifications={notifications}
            onLogout={logout}
          />

          <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-hidden px-4 py-6 md:px-8 space-y-6">
            <DashboardHeader metrics={metrics} isLoading={overviewLoading} />

            {overviewError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {overviewError}
              </div>
            )}

            {!overviewLoading && !overviewError && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    key: "processing",
                    label: "Processing",
                    chipClass: "bg-orange-50 text-orange-600",
                  },
                  {
                    key: "shipped",
                    label: "Shipped",
                    chipClass: "bg-blue-50 text-blue-600",
                  },
                  {
                    key: "delivered",
                    label: "Delivered",
                    chipClass: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    key: "returned",
                    label: "Return/Replace",
                    chipClass: "bg-slate-100 text-slate-600",
                  },
                ].map(({ key, label, chipClass }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <p
                      className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${chipClass}`}
                    >
                      {statusBreakdown?.[key] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <RecentOrdersTable
              orders={orders}
              isLoading={ordersLoading}
              error={ordersError}
              totalOrders={metrics?.orders || orders.length}
              statusBreakdown={statusBreakdown}
              filters={orderFiltersDraft}
              appliedFilters={appliedFiltersSummary}
              onFiltersChange={handleDraftFilterChange}
              onApplyFilters={applyOrderFilters}
              onClearFilters={clearOrderFilters}
              onOrderDeleted={handleOrderDeleted}
              onOrderUpdated={handleOrderUpdated}
              onViewAll={() => navigate("/admin/orders")}
            />

            <AdminUsersTable
              users={users}
              isLoading={usersLoading}
              error={usersError}
              onUserUpdated={handleUserUpdated}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
