import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { SearchProvider } from "./contexts/SearchContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductPage from "./pages/ProductPage";
import CategoryPage from "./pages/CategoryPage";
import BrandPage from "./pages/BrandPage";
import Cart from "./pages/Cart";
import CheckoutLayout from "./pages/checkout/CheckoutLayout";
import CheckoutOrder from "./pages/checkout/CheckoutOrder";
import CheckoutAddress from "./pages/checkout/CheckoutAddress";
import CheckoutPayment from "./pages/checkout/CheckoutPayment";
import CheckoutConfirmation from "./pages/checkout/CheckoutConfirmation";
import OrdersPage from "./pages/orders/OrdersPage";
import OrderDetailsPage from "./pages/orders/OrderDetailsPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordOtp from "./pages/ResetPasswordOtp";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import HelpSupport from "./pages/HelpSupport";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsAndConditions from "./pages/legal/TermsAndConditions";
import ReturnPolicy from "./pages/legal/ReturnPolicy";
import SearchResults from "./pages/SearchResults";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminAddProductPage from "./pages/AdminAddProductPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminOrderDetailsPage from "./pages/AdminOrderDetailsPage";
import AdminHelpSupportPage from "./pages/AdminHelpSupportPage";
import AdminHeroCarouselPage from "./pages/AdminHeroCarouselPage";
import AdminCustomersPage from "./pages/AdminCustomersPage";
import AdminCouponsPage from "./pages/AdminCouponsPage";
import AdminFooterCategoriesPage from "./pages/AdminFooterCategoriesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Offers from "./pages/Offers";

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
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="brand/:slug" element={<BrandPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password-otp" element={<ResetPasswordOtp />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="help-support" element={<HelpSupport />} />
          <Route path="legal/privacy" element={<PrivacyPolicy />} />
          <Route path="legal/terms" element={<TermsAndConditions />} />
          <Route path="legal/returns" element={<ReturnPolicy />} />
          <Route path="offers" element={<Offers />} />

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
    </SearchProvider>
  );
}

export default App;
