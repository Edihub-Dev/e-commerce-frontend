import React, { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import SeoHead from "./seo/SeoHead";

const Layout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const mainPaddingClass = isHomePage
    ? "flex-grow overflow-x-hidden pt-0 pb-6 md:pt-0 md:pb-8"
    : "flex-grow overflow-x-hidden px-4 py-6 md:px-8 md:py-8";
  const canonicalPath = location.pathname || "/";

  const organizationSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "p2pdeal",
      url: "https://shop.p2pdeal.net",
      logo: "https://shop.p2pdeal.net/assets/logo/p2pdeal-logo.png",
      sameAs: [
        "https://www.facebook.com/p2pdeal",
        "https://www.instagram.com/p2pdeal",
        "https://www.linkedin.com/company/p2pdeal",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+91-XXXXXXXXXX",
          contactType: "customer service",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      ],
    }),
    []
  );

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white">
      <SeoHead
        canonicalPath={canonicalPath}
        schema={organizationSchema}
        openGraph={{ url: canonicalPath === "/" ? undefined : canonicalPath }}
      />
      <Header />
      <main className={mainPaddingClass}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
