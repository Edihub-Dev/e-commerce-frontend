import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PropTypes from "prop-types";

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireSeller = false,
}) => {
  const { isAuthenticated, loading, isAdmin, isSeller } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireSeller && !isSeller) {
    return <Navigate to="/seller/register" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireAdmin: PropTypes.bool,
  requireSeller: PropTypes.bool,
};

ProtectedRoute.defaultProps = {
  requireAdmin: false,
  requireSeller: false,
};

export default ProtectedRoute;
