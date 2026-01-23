import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, RefreshCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SubadminSidebar from "../components/subadmin/SubadminSidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { fetchSubadminSellers } from "../services/subadminApi";

const SubadminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [viewSeller, setViewSeller] = useState(null);

  const loadSellers = async ({ silent } = { silent: false }) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchSubadminSellers();
      setSellers(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error("Failed to load sellers for subadmin", err);
      setError(err.message || "Unable to load sellers.");
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sellersSortedByCreated = useMemo(() => {
    return [...sellers].sort((a, b) => {
      const aCreated = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aCreated - bCreated;
    });
  }, [sellers]);

  const filteredSellers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return sellersSortedByCreated;

    return sellersSortedByCreated.filter((seller) => {
      const values = [
        seller.name,
        seller.username,
        seller.email,
        seller.mobile,
        seller.companyName,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(query));
    });
  }, [searchValue, sellersSortedByCreated]);

  const metrics = useMemo(() => {
    const total = sellers.length;
    const verified = sellers.filter((seller) => seller?.isVerified).length;
    return { total, verified };
  }, [sellers]);

  const handleRefresh = () => {
    if (refreshing) return;
    loadSellers({ silent: true });
  };

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
            activeRange="All Date"
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
                <p className="text-sm text-slate-500">Subadmin / Dashboard</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Sellers Overview
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search by name, email or mobile"
                    className="w-56 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">
                  Total Sellers
                </p>
                <p className="mt-2 text-2xl font-semibold">{metrics.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">
                  Verified (info)
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Sellers
                </h2>
                <p className="text-xs text-slate-500">
                  Click on Seller ID to view their products, orders & coupons.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 w-16">
                        S/N
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        Seller Name
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        Mobile
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">
                        Seller Detail
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          Loading sellers...
                        </td>
                      </tr>
                    ) : filteredSellers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-slate-500"
                        >
                          No sellers found.
                        </td>
                      </tr>
                    ) : (
                      filteredSellers.map((seller, index) => (
                        <tr key={seller._id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 align-middle text-xs font-semibold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 align-middle text-slate-800">
                            {seller.name || seller.username || "--"}
                          </td>
                          <td className="px-3 py-2 align-middle text-slate-600">
                            {seller.email || "--"}
                          </td>
                          <td className="px-3 py-2 align-middle text-slate-600">
                            {seller.mobile || "--"}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/subadmin/sellers/${seller._id}`)
                              }
                              className="text-xs font-semibold text-blue-600 underline underline-offset-4"
                            >
                              View details
                            </button>
                          </td>
                          <td className="px-3 py-2 align-middle text-center">
                            <button
                              type="button"
                              onClick={() => setViewSeller(seller)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                              aria-label="View seller details"
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
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {viewSeller && (
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
                onClick={() => setViewSeller(null)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="space-y-1 pr-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Seller Overview
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {viewSeller.name || viewSeller.username || "Seller"}
                </h2>
                <p className="text-xs text-slate-500">
                  ID: <span className="font-mono">{viewSeller._id}</span>
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <span>
                    {viewSeller.isVerified ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-all text-slate-800">
                    {viewSeller.email || "--"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Mobile
                  </p>
                  <p className="mt-1 text-slate-800">
                    {viewSeller.mobile || "--"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Company
                  </p>
                  <p className="mt-1 text-slate-800">
                    {viewSeller.companyName || "--"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewSeller(null)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubadminDashboard;
