import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TicketPercent,
  LogOut,
  Home,
} from "lucide-react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/seller/dashboard", icon: LayoutDashboard },
  { label: "Products", to: "/seller/products", icon: Package },
  { label: "Orders", to: "/seller/orders", icon: ShoppingBag },
  { label: "Coupons", to: "/seller/coupons", icon: TicketPercent },
  { label: "User Dashboard", to: "/", icon: Home },
];

const MotionLink = motion(Link);

const SellerSidebar = ({ onNavigate, className }) => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside
      className={`flex h-full w-72 flex-col border-r border-slate-200 bg-white px-6 py-8 lg:sticky lg:top-0 lg:h-screen ${className}`.trim()}
    >
      <div className="flex items-center gap-3 text-slate-900">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-base font-semibold text-blue-600">
          S
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Seller Hub
          </p>
          <h1 className="text-lg font-semibold">p2pdeal panel</h1>
        </div>
      </div>

      <nav className="mt-10 flex-1 space-y-2">
        {navItems.map(({ label, to, icon: Icon }) => {
          const isActive =
            location.pathname === to || location.pathname.startsWith(`${to}/`);

          return (
            <MotionLink
              key={label}
              whileHover={{ x: 6 }}
              to={to}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-100 text-blue-700 shadow-sm"
                  : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              <Icon size={18} />
              {label}
            </MotionLink>
          );
        })}
      </nav>

      <div className="mt-8 space-y-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          <LogOut size={18} />
          Logout
        </button>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Seller Hub. All rights reserved.
        </p>
      </div>
    </aside>
  );
};

SellerSidebar.propTypes = {
  onNavigate: PropTypes.func,
  className: PropTypes.string,
};

SellerSidebar.defaultProps = {
  onNavigate: undefined,
  className: "hidden lg:flex",
};

export default SellerSidebar;
