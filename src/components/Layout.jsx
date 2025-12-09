import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const mainPaddingClass = isHomePage
    ? "flex-grow overflow-x-hidden pt-0 pb-6 md:pt-1 md:pb-8"
    : "flex-grow overflow-x-hidden px-4 py-6 md:px-8 md:py-8";

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white">
      <Header />
      <main className={mainPaddingClass}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
