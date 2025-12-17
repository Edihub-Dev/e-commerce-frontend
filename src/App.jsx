import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { SearchProvider } from "./contexts/SearchContext";
import Layout from "./components/Layout";
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const Cart = lazy(() => import("./pages/Cart"));
const CheckoutLayout = lazy(() => import("./pages/checkout/CheckoutLayout"));
const CheckoutOrder = lazy(() => import("./pages/checkout/CheckoutOrder"));
const CheckoutAddress = lazy(() => import("./pages/checkout/CheckoutAddress"));
const CheckoutPayment = lazy(() => import("./pages/checkout/CheckoutPayment"));
const CheckoutConfirmation = lazy(() =>
  import("./pages/checkout/CheckoutConfirmation")
);
const OrdersPage = lazy(() => import("./pages/orders/OrdersPage"));
const OrderDetailsPage = lazy(() => import("./pages/orders/OrderDetailsPage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordOtp = lazy(() => import("./pages/ResetPasswordOtp"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsAndConditions = lazy(() =>
  import("./pages/legal/TermsAndConditions")
);
const ReturnPolicy = lazy(() => import("./pages/legal/ReturnPolicy"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage"));
const AdminAddProductPage = lazy(() => import("./pages/AdminAddProductPage"));
const AdminOrdersPage = lazy(() => import("./pages/AdminOrdersPage"));
const AdminOrderDetailsPage = lazy(() =>
  import("./pages/AdminOrderDetailsPage")
);
const AdminHelpSupportPage = lazy(() => import("./pages/AdminHelpSupportPage"));
const AdminHeroCarouselPage = lazy(() =>
  import("./pages/AdminHeroCarouselPage")
);
const AdminCustomersPage = lazy(() => import("./pages/AdminCustomersPage"));
const AdminCouponsPage = lazy(() => import("./pages/AdminCouponsPage"));
const AdminFooterCategoriesPage = lazy(() =>
  import("./pages/AdminFooterCategoriesPage")
);
const AdminOfferLightboxPage = lazy(() =>
  import("./pages/AdminOfferLightboxPage")
);
const SellerSignup = lazy(() => import("./pages/SellerSignup"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const SellerLayout = lazy(() => import("./components/seller/SellerLayout"));
const SellerProducts = lazy(() => import("./pages/SellerProducts"));
const SellerOrders = lazy(() => import("./pages/SellerOrders"));
const SellerOrderDetailsPage = lazy(() =>
  import("./pages/SellerOrderDetailsPage")
);
const SellerCoupons = lazy(() => import("./pages/SellerCoupons"));
const SellerAddProduct = lazy(() => import("./pages/SellerAddProduct"));
import ProtectedRoute from "./components/ProtectedRoute";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

function App() {
  return (
    <SearchProvider>
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="category/:slug" element={<CategoryPage />} />
            <Route path="brand/:slug" element={<BrandPage />} />
            <Route path="cart" element={<Cart />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="seller/register" element={<SellerSignup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password-otp" element={<ResetPasswordOtp />} />
            <Route path="verify-email" element={<VerifyEmail />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="help-support" element={<HelpSupport />} />
            <Route path="legal/privacy" element={<PrivacyPolicy />} />
            <Route path="legal/terms" element={<TermsAndConditions />} />
            <Route path="legal/returns" element={<ReturnPolicy />} />

            <Route
              path="checkout"
              element={
                <ProtectedRoute>
                  <CheckoutLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CheckoutOrder />} />
              <Route path="order" element={<CheckoutOrder />} />
              <Route path="address" element={<CheckoutAddress />} />
              <Route path="payment" element={<CheckoutPayment />} />
              <Route path="confirmation" element={<CheckoutConfirmation />} />
              <Route
                path="confirmation/:orderId"
                element={<CheckoutConfirmation />}
              />
            </Route>
            <Route
              path="orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/:orderId"
              element={
                <ProtectedRoute>
                  <OrderDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route
            path="/seller"
            element={
              <ProtectedRoute requireSeller>
                <SellerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SellerDashboard />} />
            <Route path="dashboard" element={<SellerDashboard />} />
            {/* <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<SellerAddProduct />} />
            <Route path="products/:id" element={<SellerAddProduct />} /> */}
            {/* <Route path="orders" element={<SellerOrders />} /> */}
            {/* <Route
              path="orders/:orderId"
              element={<SellerOrderDetailsPage />}
            /> */}
            {/* <Route path="coupons" element={<SellerCoupons />} /> */}
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute requireAdmin>
                <AdminProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute requireAdmin>
                <AdminOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coupons"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCouponsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/footer-categories"
            element={
              <ProtectedRoute requireAdmin>
                <AdminFooterCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/help-support"
            element={
              <ProtectedRoute requireAdmin>
                <AdminHelpSupportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hero-carousel"
            element={
              <ProtectedRoute requireAdmin>
                <AdminHeroCarouselPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/offer-lightbox"
            element={
              <ProtectedRoute requireAdmin>
                <AdminOfferLightboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders/:orderId"
            element={
              <ProtectedRoute requireAdmin>
                <AdminOrderDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <ProtectedRoute requireAdmin>
                <AdminAddProductPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </SearchProvider>
  );
}

export default App;
