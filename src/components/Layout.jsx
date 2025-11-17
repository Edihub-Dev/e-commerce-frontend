import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const mainPaddingClass = isHomePage
    ? "flex-grow px-4 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8"
    : "flex-grow px-4 py-6 md:px-8 md:py-8";

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className={mainPaddingClass}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
