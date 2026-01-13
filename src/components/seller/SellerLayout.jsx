import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import SellerSidebar from "./SellerSidebar";
import SellerTopbar from "./SellerTopbar";

const SellerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const previousDocumentStylesRef = useRef({
    bodyOverflow: "",
    bodyHeight: "",
    htmlOverflow: "",
    htmlHeight: "",
    rootHeight: "",
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const { body, documentElement } = document;
    const root = document.getElementById("root");

    previousDocumentStylesRef.current = {
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      htmlOverflow: documentElement.style.overflow,
      htmlHeight: documentElement.style.height,
      rootHeight: root?.style.height || "",
    };

    body.style.overflow = "hidden";
    body.style.height = "100%";
    documentElement.style.overflow = "hidden";
    documentElement.style.height = "100%";
    if (root) {
      root.style.height = "100%";
    }

    return () => {
      body.style.overflow = previousDocumentStylesRef.current.bodyOverflow;
      body.style.height = previousDocumentStylesRef.current.bodyHeight;
      documentElement.style.overflow =
        previousDocumentStylesRef.current.htmlOverflow;
      documentElement.style.height =
        previousDocumentStylesRef.current.htmlHeight;
      if (root) {
        root.style.height = previousDocumentStylesRef.current.rootHeight;
      }
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full w-full min-h-0 overflow-hidden">
        <SellerSidebar className="hidden lg:flex lg:w-72 lg:flex-none" />

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
                className="h-full w-72 max-w-sm overflow-y-auto drop-shadow-xl"
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

        <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden">
          <SellerTopbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <main className="min-h-0 bg-slate-50 px-5 pb-10 pt-6 sm:px-8 lg:px-12">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLayout;
