import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const SellerRouteBoundary = ({ children }) => {
  const { isSeller, loading } = useAuth();

  if (loading) {
    return (
      <div className="px-6 py-16 text-white">Loading seller portal...</div>
    );
  }

  if (!isSeller) {
    return <Navigate to="/" replace />;
  }

  return children;
};

SellerRouteBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SellerRouteBoundary;
