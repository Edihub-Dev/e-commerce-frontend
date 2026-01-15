import PropTypes from "prop-types";
import { motion } from "framer-motion";

const MetricCard = ({
  icon,
  label,
  value,
  accent,
  isLoading,
  onClick,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 ${
        className ?? ""
      }`}
    >
      <div
        className={`h-12 w-12 rounded-2xl grid place-items-center text-xl font-semibold ${accent}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">
          {isLoading ? (
            <span className="inline-block h-6 w-20 rounded-md bg-slate-200 animate-pulse" />
          ) : (
            value
          )}
        </p>
      </div>
    </motion.div>
  );
};

MetricCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  accent: PropTypes.string,
  isLoading: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

MetricCard.defaultProps = {
  accent: "bg-blue-50 text-blue-600",
  isLoading: false,
  onClick: undefined,
  className: "",
};

export default MetricCard;
