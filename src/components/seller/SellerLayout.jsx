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
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const storeCurrentStyles = () => {
      const { body, documentElement } = document;
      const root = document.getElementById("root");
      previousDocumentStylesRef.current = {
        bodyOverflow: body.style.overflow,
        bodyHeight: body.style.height,
        htmlOverflow: documentElement.style.overflow,
        htmlHeight: documentElement.style.height,
        rootHeight: root?.style.height || "",
      };
    };

    const applyLock = () => {
      if (isLockedRef.current) return;
      storeCurrentStyles();

      const { body, documentElement } = document;
      const root = document.getElementById("root");

      body.style.overflow = "hidden";
      body.style.height = "100%";
      documentElement.style.overflow = "hidden";
      documentElement.style.height = "100%";
      if (root) {
        root.style.height = "100%";
      }

      isLockedRef.current = true;
    };

    const releaseLock = () => {
      if (!isLockedRef.current) return;

      const { body, documentElement } = document;
      const root = document.getElementById("root");
      body.style.overflow = previousDocumentStylesRef.current.bodyOverflow;
      body.style.height = previousDocumentStylesRef.current.bodyHeight;
      documentElement.style.overflow =
        previousDocumentStylesRef.current.htmlOverflow;
      documentElement.style.height =
        previousDocumentStylesRef.current.htmlHeight;
      if (root) {
        root.style.height = previousDocumentStylesRef.current.rootHeight;
      }

      isLockedRef.current = false;
    };

    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleChange = (matches) => {
      if (matches) {
        applyLock();
      } else {
        releaseLock();
      }
    };

    handleChange(mediaQuery.matches);

    const listener = (event) => handleChange(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", listener);
      } else {
        mediaQuery.removeListener(listener);
      }
      releaseLock();
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 lg:h-screen lg:w-screen lg:overflow-hidden">
      <div className="flex w-full min-h-screen lg:h-full lg:min-h-0 lg:overflow-hidden">
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

        <div className="flex flex-1 flex-col min-h-screen lg:h-full lg:min-h-0 lg:overflow-hidden">
          <SellerTopbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto">
            <main className="bg-slate-50 px-5 pb-10 pt-6 sm:px-8 lg:px-12 lg:min-h-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLayout;
