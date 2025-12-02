import { Bell, LogOut, ChevronDown, Menu } from "lucide-react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const ranges = ["All Date", "12 Months", "30 Days", "7 Days", "24 Hour"];

const Navbar = ({
  onToggleSidebar,
  activeRange,
  onSelectRange,
  adminName,
  adminRole,
  notifications,
  showRangeSelector,
  showNotifications,
  onLogout,
}) => {
  const displayName = adminName || "Admin";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const notificationCount =
    (notifications?.pendingOrders || 0) +
    (notifications?.shippedOrders || 0) +
    (notifications?.deliveredOrders || 0);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition"
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
          <div className="max-w-[70vw] space-y-0.5 sm:max-w-none sm:space-y-1">
            <h1 className="text-base font-semibold text-slate-900 sm:text-xl">
              Welcome Back {displayName}
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Manage Sales, Orders, Customers and Deliveries
            </p>
          </div>
        </div>

        <div className="flex flex-1 justify-end items-center gap-6 pr-2 sm:pr-4">
          {showRangeSelector && (
            <nav className="hidden sm:flex items-center gap-2 bg-slate-100/60 rounded-full px-1 py-1">
              {ranges.map((range) => {
                const isActive = range === activeRange;
                return (
                  <motion.button
                    key={range}
                    whileHover={{ y: -1 }}
                    onClick={() => onSelectRange(range)}
                    className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-full transition ${
                      isActive
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {range}
                  </motion.button>
                );
              })}
            </nav>
          )}

          {showNotifications && (
            <button
              type="button"
              className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-blue-500 text-white text-[10px]">
                {notificationCount}
              </span>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 px-2 py-2 hover:border-blue-200 transition sm:gap-3 sm:px-3"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white grid place-items-center font-semibold">
                {initials || "AD"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">
                  {adminRole || "Administrator"}
                </p>
              </div>
              <ChevronDown
                size={18}
                className="hidden text-slate-400 sm:block"
              />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className="px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {adminRole || "Administrator"}
                    </p>
                  </div>
                  <div className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onLogout?.();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

Navbar.propTypes = {
  onToggleSidebar: PropTypes.func.isRequired,
  activeRange: PropTypes.string.isRequired,
  onSelectRange: PropTypes.func.isRequired,
  adminName: PropTypes.string,
  adminRole: PropTypes.string,
  notifications: PropTypes.shape({
    pendingOrders: PropTypes.number,
    shippedOrders: PropTypes.number,
    deliveredOrders: PropTypes.number,
  }),
  showRangeSelector: PropTypes.bool,
  showNotifications: PropTypes.bool,
  onLogout: PropTypes.func,
};

Navbar.defaultProps = {
  adminName: "",
  adminRole: "Administrator",
  notifications: {
    pendingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
  },
  showRangeSelector: true,
  showNotifications: true,
  onLogout: undefined,
};

export default Navbar;
