import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicFooterCategories } from "../services/footerCategoryApi";

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const customerServices = [
    { label: "Privacy Policy", to: "/legal/privacy" },
    { label: "Terms & Conditions", to: "/legal/terms" },
    { label: "Return Policy", to: "/legal/returns" },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetchPublicFooterCategories();
        if (!isMounted) return;

        const data = Array.isArray(response.data) ? response.data : [];

        setCategories(
          data.map((category) => ({
            name: category.name,
            slug: category.slug || "",
          }))
        );
      } catch (error) {
        console.error("Failed to load footer categories", error);
        if (isMounted) {
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoadingCategories(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const popularCategories = useMemo(() => {
    if (categories.length) {
      return categories;
    }

    return [];
  }, [categories]);

  return (
    <footer
      className="text-white pt-12 pb-6 relative overflow-hidden"
      style={{ backgroundColor: "#008ECC" }}
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-8 justify-items-center max-w-6xl mx-auto">
          {/* Most Popular Categories */}
          <div className="text-center">
            <h3 className="font-semibold text-base mb-4 border-b-2 border-white pb-1 inline-block mx-auto">
              Most Popular Categories
            </h3>
            <ul className="space-y-2 text-center">
              {loadingCategories && !popularCategories.length && (
                <li className="text-sm opacity-80">Loading categories…</li>
              )}
              {!loadingCategories && !popularCategories.length && (
                <li className="text-sm opacity-80">Categories unavailable</li>
              )}
              {popularCategories.map((category) => (
                <li key={category.name}>
                  <Link
                    to={
                      category.slug
                        ? `/category/${encodeURIComponent(category.slug)}`
                        : "/shop"
                    }
                    className="text-sm hover:underline"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Services */}
          <div className="text-center">
            <h3 className="font-semibold text-base mb-4 border-b-2 border-white pb-1 inline-block mx-auto">
              Customer Services
            </h3>
            <ul className="space-y-2 text-center">
              {customerServices.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="text-center flex flex-col items-center gap-3">
            <h3 className="text-xl font-semibold mb-4 border-b-2 border-white pb-1 inline-block px-4">
              Contact Us
            </h3>
            <Link
              to="/help-support"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium bg-white text-[#008ECC] px-5 py-2 rounded-full shadow-sm hover:shadow-md hover:bg-blue-50 transition-all mx-auto whitespace-nowrap"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#008ECC"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <path d="M12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9c0 2.5 1.02 4.75 2.66 6.39.19.19.3.45.28.72l-.14 2.02a1 1 0 001.09 1.09l2.02-.14c.27-.02.53.09.72.28A8.96 8.96 0 0012 22z" />
                <path d="M8 12h.01" />
                <path d="M12 12h.01" />
                <path d="M16 12h.01" />
              </svg>
              Help &amp; Support
            </Link>
          </div>
        </div>

        <div className="border-t border-white/15 mt-8 pt-4 text-center">
          <p className="text-sm">© 2025 All rights reserved. p2pdeal</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
