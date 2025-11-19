import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../utils/api";

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const customerServices = [
    "About Us",
    "Terms & Conditions",
    "FAQ",
    "Privacy Policy",
    "E-waste Policy",
    "Cancellation & Return Policy",
  ];

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const { data } = await fetchProducts({ limit: 200 });
        if (!isMounted) return;

        const categoryMap = new Map();
        data.forEach((product) => {
          const rawCategory =
            typeof product.category === "string" ? product.category : "";
          const name = rawCategory.trim();
          if (!name) return;

          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          if (!categoryMap.has(name)) {
            categoryMap.set(name, {
              name,
              slug: slug || "",
            });
          }
        });

        setCategories(Array.from(categoryMap.values()));
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
          {/* MegaMart & Contact */}
          <div>
            <h3 className="text-2xl font-bold mb-6">MegaMart</h3>
            <div className="space-y-4">
              <h3 className="font-semibold text-base mb-4 border-b-2 border-white pb-1 inline-block">
                Contact Us
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://wa.me/12029182132"
                    className="flex items-center space-x-2 text-sm hover:underline"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#25D366"
                      className="flex-shrink-0"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>WhatsApp: +1 202-918-2132</span>
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+12029182132"
                    className="flex items-center space-x-2 text-sm hover:underline"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#000000"
                      className="flex-shrink-0"
                    >
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    <span>Call Us: +1 202-918-2132</span>
                  </a>
                </li>
              </ul>
              {/* <div className="mt-6">
                <p className="font-semibold text-base mb-3">Download App</p>
                <div className="flex gap-3">
                  <a href="#" className="block">
                    <img
                      src="https://img-wrapper.vercel.app/image?url=https://s3-alpha-sig.figma.com/img/4223/4185/46df7c84aa0528e7b14d171980539ec6?Expires=1760918400&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=LaTBP2LFFDBqEu8gEzrVG1Ripch-cQZOzI5FEAnJftB1j7G~XbyHzT0gGFLD8NpnS1YmmCPJ8EEyBhyf-wp9wsO2MjeptTAv-~Ef5ECkZ3ozb1qmGqW5UgCbxZI8mB5aEDUPw5Zx~LK~1C3HtqlxXrpj8oCzNs7KChqoS7A0yqw-5QO0rRdzf4t8IB1BbfGWOaw1nULG~Ljhass9nxjUgM4KC8o7JYQlksv4NTMdAESTs4NU8jpnrDG~fh0kylbUuGsNwsZ3qhG3jrR2O4vQc40rfT75uBCepMTKEfuSZMch3LlFaFHDQKz0lGehuIEKAmG1Ygvu2Haj8D7HOagQZA__"
                      alt="App Store"
                      className="h-10 w-auto"
                    />
                  </a>
                  <a href="#" className="block">
                    <img
                      src="https://img-wrapper.vercel.app/image?url=https://s3-alpha-sig.figma.com/img/8d47/7c98/8e9645df6d1a3c42b5719805f5d41e6b?Expires=1760918400&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=c6ieMXZkbOS25rOu39FdGZzhbmDjHScDsNhUUT0FbVtPmsaODIo6qP~QdycwM6DwbRPGf1Ntw4rBzCpyB4gYA9LWnF49C8xQgg0v44DiRTjhycVYB70DWy4ZGKjxMOrAHVgm1e~-PT0JaHT~TsMUv8yClLLb7BiGbcXXz1CLeicHu57ojpliE3s9EA0T33GPPAXOcVRnR-tBnuBCauoFyEXiXa0zxZdWwTJoeltPkIbvRZ62BFyt74w4Z7GFO7bcEp0vN6EXRiFFNUefATZlldPMmxYHI2QDeS55poJwZX6vtAJrEs8ccZGNDOmWjKxAUWmylYSSlpVPhpH9dXOhSg__"
                      alt="Google Play"
                      className="h-10 w-auto"
                    />
                  </a>
                </div>
              </div> */}
            </div>
          </div>

          {/* Popular Categories */}
          <div>
            <h3 className="font-semibold text-base mb-4 border-b-2 border-white pb-1 inline-block">
              Most Popular Categories
            </h3>
            <ul className="space-y-2 ">
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
          <div>
            <h3 className="font-semibold text-base mb-4 border-b-2 border-white pb-1 inline-block">
              Customer Services
            </h3>
            <ul className="space-y-2">
              {customerServices.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm hover:underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 mt-8 pt-4 text-center">
          <p className="text-sm">
            © 2022 All rights reserved. Reliance Retail Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
