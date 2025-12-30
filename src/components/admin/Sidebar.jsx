import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TicketPercent,
  Users,
  Home,
  MessageCircleQuestion,
  List,
  Store,
} from "lucide-react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
  { label: "Hero Carousel", icon: Home, to: "/admin/hero-carousel" },
  {
    label: "Offers Lightbox",
    icon: TicketPercent,
    to: "/admin/offer-lightbox",
  },
  { label: "Seller Details", icon: Store, to: "/admin/sellers" },
  { label: "Products", icon: Package, to: "/admin/products" },
  { label: "Orders", icon: ShoppingBag, to: "/admin/orders" },
  { label: "Customers", icon: Users, to: "/admin/customers" },
  { label: "Coupons", icon: TicketPercent, to: "/admin/coupons" },
  {
    label: "Footer Categories",
    icon: List,
    to: "/admin/footer-categories",
  },
  {
    label: "Help & Support",
    icon: MessageCircleQuestion,
    to: "/admin/help-support",
  },
];

const MotionLink = motion.create(Link);

const Sidebar = ({ active, className, onNavigate }) => {
  const baseClasses =
    "bg-white border-r border-slate-200 h-full md:h-screen md:sticky md:top-0 md:left-0";
  const [currentItem, setCurrentItem] = useState(active);

  useEffect(() => {
    setCurrentItem(active);
  }, [active]);

  return (
    <aside className={`${baseClasses} ${className}`}>
      <div className="flex h-full w-full flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-hidden px-6 py-8 space-y-12">
          <div className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-600 font-bold">
              P
            </div>
            <span>p2pdeal Admin</span>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map(({ label, icon: Icon, to }) => {
              const isActive = label === currentItem;
              return (
                <MotionLink
                  key={label}
                  whileHover={{ x: 6 }}
                  to={to}
                  onClick={() => {
                    setCurrentItem(label);
                    onNavigate?.();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </MotionLink>
              );
            })}
            <div className="pt-4 mt-6 border-t border-slate-100">
              <MotionLink
                to="/"
                whileHover={{ x: 6 }}
                onClick={() => onNavigate?.()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 transition-colors hover:text-blue-600 hover:bg-blue-50"
              >
                <Home size={20} />
                User Dashboard
              </MotionLink>
            </div>
          </nav>

          <div className="hidden lg:block text-xs text-slate-400">
            © {new Date().getFullYear()} p2pdeal. All rights reserved.
          </div>
        </div>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  active: PropTypes.string,
  className: PropTypes.string,
  onNavigate: PropTypes.func,
};

Sidebar.defaultProps = {
  active: "Dashboard",
  className: "hidden md:flex md:w-64",
  onNavigate: undefined,
};

export default Sidebar;
