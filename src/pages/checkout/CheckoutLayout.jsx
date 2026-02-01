import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
import { ShoppingBag } from "lucide-react";

const steps = [
  { id: "order", label: "Order Summary", path: "/checkout/order" },
  { id: "address", label: "Delivery Address", path: "/checkout/address" },
  { id: "payment", label: "Payment", path: "/checkout/payment" },
  { id: "confirmation", label: "Confirmation", path: "/checkout/confirmation" },
];

const getStepFromPath = (pathname) => {
  if (pathname.includes("/checkout/payment-success")) return "confirmation";
  if (pathname.includes("/checkout/payment-failed")) return "confirmation";
  if (pathname.includes("/checkout/payment")) return "payment";
  if (pathname.includes("/checkout/address")) return "address";
  if (pathname.includes("/checkout/confirmation")) return "confirmation";
  return "order";
};

const CheckoutLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const checkout = useSelector((state) => state.checkout);

  const activeStep = useMemo(
    () => getStepFromPath(location.pathname),
    [location.pathname]
  );

  useEffect(() => {
    const isConfirmationStep =
      getStepFromPath(location.pathname) === "confirmation";
    const hasActiveOrder = Boolean(checkout.orderId);

    const searchParams = new URLSearchParams(location.search || "");
    const hasDeepLinkProduct = Boolean(searchParams.get("productId"));
    const isOrderStep = getStepFromPath(location.pathname) === "order";

    if (
      !checkout.items.length &&
      !isConfirmationStep &&
      !hasActiveOrder &&
      !(isOrderStep && hasDeepLinkProduct)
    ) {
      navigate("/cart", { replace: true });
    }
  }, [checkout.items.length, checkout.orderId, location.pathname, location.search, navigate]);

  return (
    <div className="min-h-screen bg-light-bg">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-secondary">
              Secure Checkout
            </h1>
            <p className="text-sm text-medium-text">
              Follow the steps to complete your purchase safely.
            </p>
          </div>
        </div>

        <nav className="w-full mb-10">
          <div className="hidden md:flex items-center justify-between gap-6">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const currentIndex = steps.findIndex((s) => s.id === activeStep);
              const isCompleted = currentIndex > index;
              const isActive = step.id === activeStep;

              return (
                <div key={step.id} className="flex-1">
                  <button
                    onClick={() => isCompleted && navigate(step.path)}
                    className="group w-full"
                    type="button"
                    disabled={!isCompleted}
                  >
                    <div className="flex items-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-all duration-200 ${
                          isActive
                            ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                            : isCompleted
                            ? "border-primary/40 bg-white text-primary"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {stepNumber}
                      </div>
                      {index !== steps.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-4 transition-colors duration-200 ${
                            isCompleted ? "bg-primary" : "bg-slate-200"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                  <p
                    className={`mt-3 text-sm font-medium text-center transition-colors duration-200 ${
                      isActive
                        ? "text-primary"
                        : isCompleted
                        ? "text-primary/70"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="md:hidden bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Step
              </p>
              <p className="text-sm font-semibold text-secondary">
                {steps.findIndex((s) => s.id === activeStep) + 1} of{" "}
                {steps.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Current
              </p>
              <p className="text-sm font-semibold text-primary">
                {steps.find((s) => s.id === activeStep)?.label}
              </p>
            </div>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CheckoutLayout;
