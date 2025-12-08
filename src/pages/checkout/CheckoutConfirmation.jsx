import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { fetchOrderById } from "../../utils/api";
import { setCheckoutStep } from "../../store/slices/checkoutSlice";
import { CheckCircle, Download, PackageCheck, Timer } from "lucide-react";

const CheckoutConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(
    !location.state?.order && Boolean(orderId)
  );
  const [error, setError] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(8);

  const apiBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL;
    if (configured) {
      const trimmed = configured.replace(/\/$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
    return "http://localhost:5000/api";
  }, []);

  useEffect(() => {
    dispatch(setCheckoutStep("confirmation"));
  }, [dispatch]);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || order) {
        return;
      }
      try {
        setLoading(true);
        const response = await fetchOrderById(orderId);
        const fetchedOrder = response?.data;
        if (!fetchedOrder) {
          throw new Error("Order not found");
        }
        setOrder(fetchedOrder);
      } catch (err) {
        console.error("Failed to load order", err);
        setError(err.message || "Failed to load order");
        toast.error(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, order]);

  useEffect(() => {
    if (!orderId && !location.state?.order) {
      toast("Showing your latest order", { icon: "ℹ️" });
    }
  }, [orderId, location.state?.order]);

  useEffect(() => {
    if (!order) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          navigate("/", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [order, navigate]);

  const handleGoToOrders = () => navigate("/orders");
  const handleContinueShopping = () => navigate("/shop");

  const handleDownloadInvoice = async () => {
    if (!order?._id) {
      toast.error("Order details unavailable");
      return;
    }

    setDownloadingInvoice(true);

    let toastId = null;
    try {
      toastId = toast.loading("Downloading invoice...", {
        duration: 10000,
        position: "top-center",
      });
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${apiBaseUrl}/orders/${order._id}/invoice`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to download invoice");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || `invoice-${order._id}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded.", {
        id: toastId,
        duration: 4000,
        position: "top-center",
      });
    } catch (downloadError) {
      console.error("Invoice download failed", downloadError);
      toast.error(downloadError?.message || "Invoice download failed.", {
        id: toastId || undefined,
        duration: 4000,
        position: "top-center",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-medium-text">
        Fetching your order details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-lg text-secondary font-semibold">
          Unable to load order
        </p>
        <p className="text-medium-text">{error}</p>
        <button
          onClick={handleGoToOrders}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark"
        >
          View My Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const deliveryDate = order.estimatedDeliveryDate
    ? new Date(order.estimatedDeliveryDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "To be updated";

  return (
    <div className="grid lg:grid-cols-[2fr,1fr] gap-0">
      <div className="p-6 lg:p-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-green-200 bg-green-50 p-6 flex gap-4 items-start"
        >
          <div className="h-12 w-12 rounded-full bg-white text-green-600 flex items-center justify-center shadow-md">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-secondary">
              Order placed successfully!
            </h2>
            <p className="text-sm text-medium-text mt-1">
              Your order ID is <span className="font-medium">#{order._id}</span>
              . A confirmation email has been sent to{" "}
              {order.shippingAddress?.email}.
            </p>
            <p className="text-xs text-emerald-600 mt-2">
              Redirecting you to the home page in {redirectCountdown} seconds.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-6">
          <section className="border border-slate-200 rounded-3xl p-6">
            <header className="flex items-center gap-3 mb-4 text-secondary">
              <PackageCheck className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Order Timeline</h3>
            </header>
            <ul className="space-y-3 text-sm text-medium-text">
              {order.statusTimeline?.map((event, index) => (
                <li
                  key={`${event.label}-${index}`}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary"></span>
                  <div>
                    <p className="font-medium text-secondary">{event.label}</p>
                    {event.description && <p>{event.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {event.at ? new Date(event.at).toLocaleString() : "--"}
                    </p>
                  </div>
                </li>
              ))}
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary"></span>
                <div>
                  <p className="font-medium text-secondary">
                    Estimated delivery
                  </p>
                  <p>{deliveryDate}</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="border border-slate-200 rounded-3xl p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">
              Items in this order
            </h3>
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex gap-4">
                  <div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-secondary">
                      {item.name}
                    </h4>
                    <p className="text-sm text-medium-text mt-1">
                      Qty: {item.quantity}
                      {item.size && ` • Size: ${item.size}`}
                    </p>
                    <p className="text-sm text-medium-text mt-1">
                      Price: ₹{item.price.toLocaleString()} • Line Total: ₹
                      {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-slate-200 rounded-3xl p-6 grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-secondary mb-3">
                Delivery Address
              </h3>
              <div className="space-y-1 text-sm text-medium-text">
                <p className="font-medium text-secondary">
                  {order.shippingAddress?.fullName}
                </p>
                <p>{order.shippingAddress?.addressLine}</p>
                <p>
                  {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                  - {order.shippingAddress?.pincode}
                </p>
                <p>Mobile: {order.shippingAddress?.mobile}</p>
                {order.shippingAddress?.alternatePhone && (
                  <p>Alternate: {order.shippingAddress.alternatePhone}</p>
                )}
                <p>Email: {order.shippingAddress?.email}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-secondary mb-3">
                Payment Summary
              </h3>
              <ul className="space-y-2 text-sm text-medium-text">
                <li className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.pricing?.subtotal?.toLocaleString?.()}</span>
                </li>
                <li className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{order.pricing?.shippingFee?.toLocaleString?.()}</span>
                </li>
                <li className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{order.pricing?.taxAmount?.toLocaleString?.()}</span>
                </li>
                <li className="flex justify-between text-success font-medium">
                  <span>Discount</span>
                  <span>-₹{order.pricing?.discount?.toLocaleString?.()}</span>
                </li>
                <li className="flex justify-between text-base font-semibold text-secondary border-t border-slate-200 pt-3">
                  <span>Total Paid</span>
                  <span>₹{order.pricing?.total?.toLocaleString?.()}</span>
                </li>
                <li className="text-xs text-slate-400 pt-1">
                  Method: {order.payment?.method?.toUpperCase?.()} • Status:{" "}
                  {order.payment?.status}
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleContinueShopping}
            className="px-5 py-3 rounded-xl border border-slate-200 text-secondary hover:bg-slate-50"
          >
            Continue Shopping
          </button>
          <button
            onClick={handleGoToOrders}
            className="px-5 py-3 rounded-xl bg-secondary text-white hover:bg-secondary/90"
          >
            Go to My Orders
          </button>
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="px-5 py-3 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {downloadingInvoice ? "Preparing Invoice..." : "Download Invoice"}
          </button>
        </div>
      </div>

      <aside className="bg-white border-l border-slate-100 p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3 text-secondary">
          <Timer className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Estimated Delivery</p>
            <p className="text-sm text-medium-text">{deliveryDate}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-sm text-medium-text">
          Need help with your order? Our support team is available 24/7 at
          support@p2pdeal.net.
        </div>
      </aside>
    </div>
  );
};

export default CheckoutConfirmation;
