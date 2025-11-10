import PropTypes from "prop-types";
import MetricCard from "./MetricCard";
import { BarChart3, ShoppingBag, Wallet2, UsersRound } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

const DashboardHeader = ({ metrics, isLoading }) => {
  const cards = [
    {
      label: "Sales",
      value: formatCurrency(metrics?.sales),
      icon: <BarChart3 size={22} />,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: "Orders",
      value: formatNumber(metrics?.orders),
      icon: <ShoppingBag size={22} />,
      accent: "bg-purple-50 text-purple-600",
    },
    {
      label: "Profit",
      value: formatCurrency(metrics?.profit),
      icon: <Wallet2 size={22} />,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Customer",
      value: formatNumber(metrics?.customers),
      icon: <UsersRound size={22} />,
      accent: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0">
          <MetricCard {...card} isLoading={isLoading} />
        </div>
      ))}
    </section>
  );
};

DashboardHeader.propTypes = {
  metrics: PropTypes.shape({
    sales: PropTypes.number,
    orders: PropTypes.number,
    profit: PropTypes.number,
    customers: PropTypes.number,
  }),
  isLoading: PropTypes.bool,
};

DashboardHeader.defaultProps = {
  metrics: {
    sales: 0,
    orders: 0,
    profit: 0,
    customers: 0,
  },
  isLoading: false,
};

export default DashboardHeader;
