import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import SellerSidebar from "./SellerSidebar";
import SellerTopbar from "./SellerTopbar";

const SellerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const previousOverflowRef = useRef({
    body: "",
    html: "",
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    if (isSidebarOpen) {
      previousOverflowRef.current = {
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
      };

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflowRef.current.body || "";
      document.documentElement.style.overflow =
        previousOverflowRef.current.html || "";
    }

    return () => {
      document.body.style.overflow = previousOverflowRef.current.body || "";
      document.documentElement.style.overflow =
        previousOverflowRef.current.html || "";
    };
  }, [isSidebarOpen]);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full w-full overflow-hidden">
        <SellerSidebar className="hidden lg:flex lg:h-full lg:w-72 lg:flex-none lg:flex-col lg:overflow-y-auto lg:border-r lg:border-slate-100 lg:sticky lg:top-0" />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex bg-slate-900/50 backdrop-blur lg:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="h-full w-72 max-w-sm drop-shadow-xl"
              >
                <SellerSidebar
                  className="flex"
                  onNavigate={() => setIsSidebarOpen(false)}
                />
              </motion.div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsSidebarOpen(false)}
                className="flex-1"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <SellerTopbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
          <div className="flex-1 overflow-y-auto">
            <main className="min-h-full bg-slate-50 px-5 pb-10 pt-6 sm:px-8 lg:px-12">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLayout;
