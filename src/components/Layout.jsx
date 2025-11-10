import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-grow px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
