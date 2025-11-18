import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import api, { fetchOrderById, rateOrderItem } from "../../utils/api";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  MapPin,
  PackageCheck,
  Star,
  MessageCircle,
  Send,
} from "lucide-react";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAdminOrders = location.state?.from === "admin-orders";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingIndex, setSubmittingIndex] = useState(null);

  const apiBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL;
    if (configured) {
      const trimmed = configured.replace(/\/$/, "");
      return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
    }
    return "http://localhost:5000/api";
  }, []);

  const handleBackNavigation = () => {
    if (fromAdminOrders) {
      navigate("/admin/orders", { replace: true });
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const response = await fetchOrderById(orderId);
        const data = response?.data;
        if (!data) {
          throw new Error("Order not found");
        }
        setOrder(data);
      } catch (err) {
        console.error("Failed to load order", err);
        const message =
          err.response?.data?.message || err.message || "Failed to load order";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const csvRow = useMemo(() => {
    if (!order) return null;

    const itemsSummary = (order.items || [])
      .map((item) => {
        const extras = [
          item.quantity ? `x${item.quantity}` : null,
          item.size ? `Size ${item.size}` : null,
        ]
          .filter(Boolean)
          .join(" ");
        return extras ? `${item.name} (${extras})` : item.name;
      })
      .join(" | ");

    const paymentStatusLabels = {
      paid: "Successful",
      pending: "Pending",
      failed: "Failed",
      refunded: "Refunded",
    };

    const paymentMethodLabels = {
      cod: "Cash on Delivery",
      upi: "UPI",
      qr: "QR Code",
      card: "Card",
      netbanking: "Net Banking",
    };

    const paymentStatus = order.payment?.status?.toLowerCase();
    const paymentMethod = order.payment?.method?.toLowerCase();
    const totalAmount = order.totalAmount ?? order.pricing?.total ?? 0;

    return {
      id: order._id,
      placedAt: order.createdAt ? new Date(order.createdAt).toISOString() : "",
      customer: order.shippingAddress?.fullName || "Customer",
      email: order.shippingAddress?.email || "--",
      itemsSummary,
      total: Number(totalAmount).toFixed(2),
      orderStatus: (order.status || "processing").replace(/_/g, " "),
      paymentMethod:
        paymentMethodLabels[paymentMethod] ||
        paymentMethod?.toUpperCase?.() ||
        "",
      paymentStatus: paymentStatusLabels[paymentStatus] || paymentStatus || "",
    };
  }, [order]);

  const deliveryDate = useMemo(() => {
    if (!order?.estimatedDeliveryDate) {
      return "To be updated";
    }

    return new Date(order.estimatedDeliveryDate).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [order?.estimatedDeliveryDate]);

  const handleSelectRating = (itemIndex, value) => {
    if (order?.items?.[itemIndex]?.ratedAt || submittingIndex !== null) {
      return;
    }
    setActiveItemIndex(itemIndex);
    setRatingDrafts((prev) => ({
      ...prev,
      [itemIndex]: {
        rating: value,
        review: prev[itemIndex]?.review || "",
      },
    }));
  };

  const handleReviewChange = (itemIndex, value) => {
    setRatingDrafts((prev) => ({
      ...prev,
      [itemIndex]: {
        rating: prev[itemIndex]?.rating || 0,
        review: value,
      },
    }));
  };

  const handleSubmitRating = async (itemIndex) => {
    const draft = ratingDrafts[itemIndex];
    if (
      !draft?.rating ||
      submittingIndex !== null ||
      order?.items?.[itemIndex]?.ratedAt
    ) {
      return;
    }

    try {
      setSubmittingIndex(itemIndex);

      const response = await rateOrderItem(order._id, {
        itemIndex,
        rating: draft.rating,
        review: draft.review?.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Unable to submit rating");
      }

      const updatedItems = order.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              rating: response.data?.rating,
              review: response.data?.review,
              ratedAt: response.data?.ratedAt,
            }
          : item
      );

      setOrder((prev) => ({
        ...prev,
        items: updatedItems,
      }));

      setActiveItemIndex(null);
      setRatingDrafts((prev) => {
        const copy = { ...prev };
        delete copy[itemIndex];
        return copy;
      });
      toast.success("Thank you for rating this product!");
    } catch (ratingError) {
      console.error("Failed to submit rating", ratingError);
      toast.error(ratingError.message || "Unable to submit rating");
    } finally {
      setSubmittingIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10 text-center text-medium-text">
        Fetching order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10 text-center space-y-4">
        <p className="text-lg font-semibold text-secondary">
          Unable to load order
        </p>
        <p className="text-medium-text">{error || "Order not found"}</p>
        <button
          onClick={handleBackNavigation}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const isPaymentPaid =
    (order?.payment?.status || "pending").toLowerCase() === "paid";

  const handleDownloadInvoice = async () => {
    if (!order?._id) {
      toast.error("Order details unavailable");
      return;
    }

    if (!isPaymentPaid) {
      toast.error("Invoice will be available once the payment is successful.");
      return;
    }

    setDownloadingInvoice(true);

    try {
      const response = await api.get(`/orders/${order._id}/invoice`, {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      });

      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] || "";
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
    } catch (downloadError) {
      console.error("Invoice download failed", downloadError);
      const message =
        downloadError?.response?.data?.message ||
        downloadError?.message ||
        "Unable to download invoice. Please try again.";
      toast.error(message);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!csvRow) {
      toast.error("Order data not ready yet");
      return;
    }

    const escapeCsvValue = (value) => {
      if (value === undefined || value === null) return "";
      const stringValue = String(value);
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = [
      "Order ID",
      "Placed At",
      "Customer",
      "Email",
      "Items",
      "Total",
      "Order Status",
      "Payment Method",
      "Payment Status",
    ];

    const row = [
      csvRow.id,
      csvRow.placedAt,
      csvRow.customer,
      csvRow.email,
      csvRow.itemsSummary,
      csvRow.total,
      csvRow.orderStatus,
      csvRow.paymentMethod,
      csvRow.paymentStatus,
    ];

    const csvContent = [headers, row]
      .map((currentRow) => currentRow.map(escapeCsvValue).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `order-${csvRow.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 lg:py-10 space-y-6">
      <button
        onClick={handleBackNavigation}
        className="inline-flex items-center gap-2 text-sm text-medium-text hover:text-secondary"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-secondary break-all">
              Order #{order._id}
            </h1>
            <p className="text-sm text-medium-text break-words">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary uppercase">
            {order.status?.replace(/_/g, " ")}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm text-medium-text">
          <div className="flex items-center gap-3">
            <PackageCheck className="h-4 w-4 text-secondary" />
            <div className="min-w-0">
              <p className="font-medium text-secondary">Items</p>
              <p className="break-words">{order.items?.length || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-secondary" />
            <div className="min-w-0">
              <p className="font-medium text-secondary">Estimated Delivery</p>
              <p className="break-words">{deliveryDate}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-secondary">
          Items in your order
        </h2>
        <div className="space-y-4">
          {order.items?.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-secondary">{item.name}</p>
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

              <div className="border-t border-slate-100 pt-3">
                {item.ratedAt ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      {[...Array(5)].map((_, starIndex) => (
                        <Star
                          key={starIndex}
                          size={18}
                          className={
                            starIndex < Math.round(item.rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-300"
                          }
                        />
                      ))}
                      <span className="text-xs text-medium-text">
                        Rated on {new Date(item.ratedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {item.review && (
                      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-medium-text">
                        <MessageCircle className="h-4 w-4 text-secondary mt-0.5" />
                        <p className="whitespace-pre-line break-words">
                          {item.review}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, starIndex) => {
                        const ratingValue = starIndex + 1;
                        const currentDraft = ratingDrafts[index]?.rating || 0;
                        const isActive = currentDraft >= ratingValue;
                        return (
                          <button
                            key={ratingValue}
                            type="button"
                            onClick={() =>
                              handleSelectRating(index, ratingValue)
                            }
                            className="focus:outline-none"
                            disabled={submittingIndex !== null}
                            aria-label={`Rate ${ratingValue} star${
                              ratingValue > 1 ? "s" : ""
                            }`}
                          >
                            <Star
                              size={24}
                              className={
                                isActive
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-300"
                              }
                            />
                          </button>
                        );
                      })}
                    </div>
                    {activeItemIndex === index &&
                      ratingDrafts[index]?.rating > 0 && (
                        <div className="space-y-3">
                          <textarea
                            value={ratingDrafts[index]?.review || ""}
                            onChange={(event) =>
                              handleReviewChange(index, event.target.value)
                            }
                            placeholder="Share your experience with this product (optional)"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-medium-text focus:border-primary focus:outline-none"
                            rows={3}
                            maxLength={2000}
                            disabled={submittingIndex !== null}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleSubmitRating(index)}
                              disabled={submittingIndex !== null}
                              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Send className="h-4 w-4" />
                              {submittingIndex === index
                                ? "Submitting..."
                                : "Submit review"}
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 grid md:grid-cols-2 gap-6">
        <div className="space-y-2 text-sm text-medium-text break-words">
          <h3 className="text-lg font-semibold text-secondary mb-2">
            Delivery Address
          </h3>
          <p className="font-medium text-secondary">
            {order.shippingAddress?.fullName}
          </p>
          <p>{order.shippingAddress?.addressLine}</p>
          <p>
            {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
            {order.shippingAddress?.pincode}
          </p>
          <p>Mobile: {order.shippingAddress?.mobile}</p>
          {order.shippingAddress?.alternatePhone && (
            <p>Alternate: {order.shippingAddress.alternatePhone}</p>
          )}
          <p>Email: {order.shippingAddress?.email}</p>
        </div>
        <div className="space-y-2 text-sm text-medium-text">
          <h3 className="text-lg font-semibold text-secondary mb-2">
            Payment Summary
          </h3>
          <p className="flex justify-between gap-3">
            <span>Subtotal</span>
            <span>₹{order.pricing?.subtotal?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span>Shipping Fee</span>
            <span>₹{order.pricing?.shippingFee?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span>Tax</span>
            <span>₹{order.pricing?.taxAmount?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between text-success font-medium gap-3">
            <span>Discount</span>
            <span>-₹{order.pricing?.discount?.toLocaleString?.()}</span>
          </p>
          <p className="flex justify-between text-base font-semibold text-secondary border-t border-slate-200 pt-3 gap-3">
            <span>Total</span>
            <span>₹{order.pricing?.total?.toLocaleString?.()}</span>
          </p>
          <p className="text-xs text-slate-400 pt-1 break-words">
            Method: {order.payment?.method?.toUpperCase?.()} • Status:{" "}
            {order.payment?.status}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={handleBackNavigation}
          className="px-5 py-3 rounded-xl border border-slate-200 text-secondary hover:bg-slate-50"
        >
          Back to Orders
        </button>
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={downloadingInvoice || !isPaymentPaid}
          className="px-5 py-3 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {downloadingInvoice
            ? "Preparing Invoice..."
            : isPaymentPaid
            ? "Download Invoice"
            : "Invoice available after payment"}
        </button>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
