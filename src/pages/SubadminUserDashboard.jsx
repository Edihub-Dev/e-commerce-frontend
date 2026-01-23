import SubadminSidebar from "../components/subadmin/SubadminSidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SubadminUserDashboard = () => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const profile = user || {};

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <SubadminSidebar
          active="User Dashboard"
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
                  active="User Dashboard"
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
            adminName={profile.name || profile.username || "Subadmin"}
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
                Subadmin / User Dashboard
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Your Profile
              </h1>
            </div>

            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Name</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {profile.name || "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Email</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {profile.email || "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Mobile</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {profile.mobile || "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Username</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {profile.username || "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-400">Role</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {profile.role || "subadmin"}
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SubadminUserDashboard;
