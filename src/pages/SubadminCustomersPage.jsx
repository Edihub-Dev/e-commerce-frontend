import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import SubadminSidebar from "../components/subadmin/SubadminSidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { fetchSubadminCustomers } from "../services/subadminApi";
import AdminUsersTable from "../components/admin/AdminUsersTable";

const SubadminCustomersPage = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCustomers = async ({ silent } = { silent: false }) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchSubadminCustomers();
      const filtered = Array.isArray(data)
        ? data.filter((usr) => String(usr.role).toLowerCase() === "customer")
        : [];
      setCustomers(filtered);
      setError("");
    } catch (err) {
      console.error("Failed to load customers for subadmin", err);
      setError(err.message || "Unable to load customers.");
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const total = customers.length;
    const verified = customers.filter((c) => c.isVerified).length;
    return { total, verified };
  }, [customers]);

  const handleRefresh = () => {
    if (refreshing) return;
    loadCustomers({ silent: true });
  };

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <SubadminSidebar
          active="Customers"
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
                  active="Customers"
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
            adminName={user?.name || user?.username || "Subadmin"}
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Subadmin / Customers</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Customers (View Only)
                </h1>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : undefined}
                />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">
                  Total Customers
                </p>
                <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">
                  Verified Customers
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">
                  {metrics.verified}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}

            <AdminUsersTable
              users={customers}
              isLoading={loading}
              error={error}
              onUserUpdated={() => {}}
              enableManagement={false}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default SubadminCustomersPage;
