import { LayoutDashboard, Users, UserCircle2 } from "lucide-react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/subadmin" },
  { label: "Customers", icon: Users, to: "/subadmin/customers" },
  { label: "User Dashboard", icon: UserCircle2, to: "/subadmin/user" },
];

const SubadminSidebar = ({ active, className, onNavigate }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const resolveActive = (item) => {
    if (active && item.label === active) return true;
    if (item.to === "/subadmin" && currentPath === "/subadmin") return true;
    if (item.to !== "/subadmin" && currentPath.startsWith(item.to)) return true;
    return false;
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200 h-full md:h-screen md:sticky md:top-0 md:left-0 ${className}`}
    >
      <div className="flex h-full flex-col">
        <div className="px-4 py-4 border-b border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sub Admin
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Control Panel
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = resolveActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

SubadminSidebar.propTypes = {
  active: PropTypes.string,
  className: PropTypes.string,
  onNavigate: PropTypes.func,
};

SubadminSidebar.defaultProps = {
  active: "",
  className: "",
  onNavigate: undefined,
};

export default SubadminSidebar;
