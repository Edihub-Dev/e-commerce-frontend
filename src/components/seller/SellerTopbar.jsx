import { Menu, ChevronDown, LogOut } from "lucide-react";
import PropTypes from "prop-types";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";

const SellerTopbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const displayName = user?.name || user?.username || "Seller";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:text-blue-600 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
          <div className="max-w-[70vw] space-y-0.5 sm:max-w-none sm:space-y-1">
            <h1 className="text-base font-semibold text-slate-900 sm:text-xl">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Manage your catalogue and orders
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 px-2 py-2 text-left transition hover:border-blue-200 sm:gap-3 sm:px-3"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                {initials || "SL"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">Seller</p>
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
                    <p className="text-xs text-slate-500">Seller</p>
                  </div>
                  <div className="border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-50"
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

SellerTopbar.propTypes = {
  onToggleSidebar: PropTypes.func.isRequired,
};

export default SellerTopbar;
