import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import { useAuth } from "../contexts/AuthContext";
import { fetchAdminUsers } from "../services/adminUsersApi";

const AdminCustomersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const loadUsers = async ({ silent } = { silent: false }) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await fetchAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error("Failed to load users", err);
      setError(err.message || "Unable to load users. Please try again.");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserUpdated = (updatedUser) => {
    if (updatedUser?.__delete) {
      setUsers((prev) => prev.filter((usr) => usr._id !== updatedUser._id));
      return;
    }

    if (updatedUser?.__bulkDelete && Array.isArray(updatedUser.deletedIds)) {
      setUsers((prev) =>
        prev.filter((usr) => !updatedUser.deletedIds.includes(usr._id))
      );
      return;
    }

    if (updatedUser?._id) {
      setUsers((prev) =>
        prev.map((usr) =>
          usr._id === updatedUser._id ? { ...usr, ...updatedUser } : usr
        )
      );
    }
  };

  const metrics = useMemo(() => {
    const total = users.length;
    const admins = users.filter((usr) => usr.role === "admin").length;
    const verified = users.filter((usr) => usr.isVerified).length;
    const customers = total - admins;

    return {
      total,
      admins,
      customers,
      verified,
    };
  }, [users]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    loadUsers({ silent: true });
  };

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <Sidebar
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
                <Sidebar
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
                <p className="text-sm text-slate-500">Dashboard / Customers</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Customers &amp; Admins
                </h1>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : undefined}
                />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">
                  Total Accounts
                </p>
                <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Customers</p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">
                  {metrics.customers}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Admins</p>
                <p className="mt-2 text-2xl font-semibold text-violet-600">
                  {metrics.admins}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">
                  Verified Accounts
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
              users={users}
              isLoading={isLoading}
              error={error}
              onUserUpdated={(payload) => {
                handleUserUpdated(payload);
                if (payload?.__bulkDelete || payload?.__delete) {
                  return;
                }
                if (payload?._id) {
                  setError("");
                }
              }}
              enableManagement
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomersPage;
