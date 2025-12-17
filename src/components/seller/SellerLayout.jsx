import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import SellerSidebar from "./SellerSidebar";
import SellerTopbar from "./SellerTopbar";

const SellerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full w-full">
        <SellerSidebar className="hidden lg:flex lg:w-72" />

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

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-x-hidden">
          <SellerTopbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
          <main className="flex-1 min-h-0 overflow-hidden bg-slate-50">
            <div className="h-full overflow-y-auto px-5 pb-10 pt-6 sm:px-8 lg:px-12">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SellerLayout;
