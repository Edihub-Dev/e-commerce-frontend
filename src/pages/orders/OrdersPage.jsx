import { useEffect } from "react";
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
import { Package } from "lucide-react";

const OrdersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: orders, loading, error } = useSelector((state) => state.orders);

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
    const intervalId = setInterval(() => loadOrders({ showLoader: false }), 15000);

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
      className="border border-slate-200 rounded-3xl p-6 space-y-6 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-secondary">Order #{order._id}</h2>
            <p className="text-sm text-medium-text">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
          {order.status?.replace(/_/g, " ")}
        </span>
      </div>

      <section className="space-y-3 text-sm text-medium-text">
        <header className="font-medium text-secondary">Items</header>
        <ul className="space-y-3">
          {order.items?.map((item, index) => (
            <li key={`${item.name}-${index}`} className="grid sm:grid-cols-[2fr,1fr,1fr] gap-2">
              <span className="font-medium text-secondary">{item.name}</span>
              <span>
                Qty: {item.quantity}
                {item.size && ` • Size: ${item.size}`}
              </span>
              <span>₹{(item.price * item.quantity).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 text-sm text-medium-text">
        <div>
          <header className="font-medium text-secondary mb-1">Delivery Address</header>
          <p>{order.shippingAddress?.fullName}</p>
          {order.shippingAddress?.addressLine && <p>{order.shippingAddress.addressLine}</p>}
          <p>
            {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
          </p>
          <p>Mobile: {order.shippingAddress?.mobile}</p>
        </div>
        <div>
          <header className="font-medium text-secondary mb-1">Payment</header>
          <p>
            Method: {order.payment?.method?.toUpperCase?.()} <br />
            Status: {order.payment?.status}
          </p>
        </div>
        <div>
          <header className="font-medium text-secondary mb-1">Totals</header>
          <p>
            Subtotal: ₹{order.pricing?.subtotal?.toLocaleString?.()} <br />
            Shipping: ₹{order.pricing?.shippingFee?.toLocaleString?.()} <br />
            Tax: ₹{order.pricing?.taxAmount?.toLocaleString?.()} <br />
            Discount: ₹{order.pricing?.discount?.toLocaleString?.()} <br />
            <span className="font-semibold text-secondary">
              Total: ₹{order.pricing?.total?.toLocaleString?.()}
            </span>
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={() => navigate(`/orders/${order._id}`)}
          className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark"
        >
          View Order Details
        </button>
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
          Orders will appear here as soon as you place one. Try refreshing if youre expecting an update.
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
