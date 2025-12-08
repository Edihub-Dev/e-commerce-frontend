import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  setOrders,
  setOrdersLoading,
  setOrdersError,
} from "../../store/slices/ordersSlice";
import { fetchMyOrders } from "../../utils/api";

const formatStatusLabel = (status) => {
  if (!status) return "";
  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const OrdersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: orders, loading, error } = useSelector((state) => state.orders);

  const handleOpenOrder = useCallback(
    (orderId) => {
      if (!orderId) return;
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  useEffect(() => {
    let isMounted = true;
    let hasShownError = false;

    const parseResponse = (response) => {
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray(response?.data?.data)) return response.data.data;
      if (Array.isArray(response?.orders)) return response.orders;
      return [];
    };

    const loadOrders = async ({ showLoader = false } = {}) => {
      try {
        if (showLoader) {
          dispatch(setOrdersLoading(true));
        }

        const response = await fetchMyOrders();
        if (!isMounted) return;

        const data = parseResponse(response);
        dispatch(setOrders(data));
        dispatch(setOrdersError(null));
      } catch (error) {
        console.error("Failed to load orders", error);
        if (!hasShownError) {
          toast.error(error.message || "Failed to load orders");
          hasShownError = true;
        }
        if (isMounted) {
          dispatch(setOrdersError(error.message || "Failed to load orders"));
        }
      } finally {
        if (isMounted && showLoader) {
          dispatch(setOrdersLoading(false));
        }
      }
    };

    loadOrders({ showLoader: true });
    const intervalId = setInterval(
      () => loadOrders({ showLoader: false }),
      15000
    );

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      dispatch(setOrdersLoading(false));
    };
  }, [dispatch]);

  const renderOrderCard = (order) => (
    <motion.div
      key={order._id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-200 rounded-3xl p-6 space-y-4 bg-white transition-shadow cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
      role="button"
      tabIndex={0}
      onClick={() => handleOpenOrder(order._id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenOrder(order._id);
        }
      }}
      aria-label={`View details for order ${order._id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-secondary break-words">
            Order #{order._id}
          </h2>
          <p className="text-xs sm:text-sm text-medium-text break-words">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0 text-center">
          {formatStatusLabel(order.status)}
        </span>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-secondary">Items</p>
        <ul className="space-y-3">
          {(order.items || []).map((item, index) => (
            <li
              key={`${item.product || item._id || index}`}
              className="flex items-start gap-3"
            >
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-medium-text">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0 text-sm text-medium-text">
                <p className="font-medium text-secondary break-words">
                  {item.name}
                </p>
                <p className="text-xs sm:text-sm">
                  Qty: {item.quantity}
                  {item.size ? ` • Size: ${item.size}` : ""}
                </p>
                {item.price ? (
                  <p className="text-xs sm:text-sm">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end text-sm font-semibold text-primary">
        <span className="inline-flex items-center gap-1">
          View order details
        </span>
      </div>
    </motion.div>
  );

  if (loading && !orders.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-12 text-center text-medium-text">
        Fetching your latest orders...
      </div>
    );
  }

  if (!loading && !orders.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-12 text-center space-y-3">
        <h2 className="text-xl font-semibold text-secondary">No orders yet</h2>
        <p className="text-medium-text">
          Orders will appear here as soon as you place one. Try refreshing if
          youre expecting an update.
        </p>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 lg:py-10 space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}
      {orders.map(renderOrderCard)}
    </div>
  );
};

export default OrdersPage;
