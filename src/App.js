// src/App.jsx
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ScrollToTop from "../src/pages/common/ScrollToTop/ScrollToTop.jsx";


import IntroPage from "./pages/common/Intro/IntroPage";
import HomePage from "./pages/common/Home/HomePage";
import SigninPage from "./pages/Auth/SigninPage";
import SignupPage from "./pages/Auth/SignupPage";
import OAuth2Redirect from "./pages/Auth/OAuth2Redirect";
import MapPage from "./pages/common/Map/MapPage";
import PaymentPage from "./pages/payment/PaymentPage";
import PaymentSuccessPage from "./pages/payment/PaymentSuccessPage";
import PaymentFailPage from "./pages/payment/PaymentFailPage";
import AddressManagePage from "./pages/user/owner/MyPage/Address/AddressManagePage";
import PetManagePage from "./pages/user/owner/MyPage/PetManagePage";
import ProfilePage from "./pages/user/owner/MyPage/ProfilePage";
import BookingManagePage from "./pages/user/petmate/BookingManagePage";
import BookingHistoryPage from "./pages/user/owner/BookingHistoryPage";
import CompanyManagePage from "./pages/company/CompanyManagePage";
import CompanyRegisterPage from "./pages/company/CompanyRegisterPage";
import ProductManagePage from "./pages/product/ProductManagePage";
import ProductRegisterPage from "./pages/product/ProductRegisterPage";
import ProductEditPage from "./pages/product/ProductEditPage";
import Notice from "./components/common/Header/Notice";
import Event from "./components/common/Header/Event";
import UserProfilePage from "./pages/user/UserProfilePage";

// 푸터 영역
import Terms from "./components/common/Footer/policy/Terms";
import Privacy from "./components/common/Footer/policy/Privacy";
import CopyrightPolicy from "./components/common/Footer/policy/CopyrightPolicy";
import OperationPolicy from "./components/common/Footer/policy/OperationPolicy";
import FAQ from "./components/common/Footer/support/FAQ";
import Inquiry from "./components/common/Footer/support/Inquiry";
import CustomerCenter from "./components/common/Footer/support/CustomerCenter";

import "./styles/App.css";
import Header from "./components/common/Header/Header";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ReviewWritePage from "./pages/user/review/ReviewWritePage.jsx";


function AppRoutes() {
  const location = useLocation();
  const { isLogined, user } = useAuth();

  const hideHeader = location.pathname.startsWith("/intro");

  return (
    <>
      {!hideHeader && <Header />}

      {/* 라우트 이동하면 항상 맨위로 가게끔 */}
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/intro" replace />} />

          {/* 공개 */}
          <Route path="/intro" element={<IntroPage />} />
          <Route path="/home" element={<HomePage />} />

          {/* 인증 */}
          <Route path="/signin" element={<SigninPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />

          {/* 일반 */}
          <Route path="/map" element={<MapPage />} />
          <Route path="/pets" element={<PetManagePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/address" element={<AddressManagePage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/fail" element={<PaymentFailPage />} />

          {/* 반려인/펫메이트 - 통합 라우트 */}
          <Route path="/user/profile" element={<UserProfilePage />} />

          {/* 기존 라우트 리다이렉트 */}
          <Route path="/become-petowner" element={<Navigate to="/user/profile?mode=petowner" replace />} />
          <Route path="/become-petmate" element={<Navigate to="/user/profile?mode=petmate" replace />} />
          <Route path="/petowner/profile" element={<Navigate to="/user/profile?mode=petowner" replace />} />
          <Route path="/petmate-profile" element={<Navigate to="/user/profile?mode=petmate" replace />} />

          {/* 펫메이트 예약 관리 */}
          <Route path="/petmate/booking" element={<BookingManagePage />} />
          <Route path="/user/petmate/booking-manage" element={<BookingManagePage />} />

          {/* 반려인 예약 내역 */}
          <Route path="/user/owner/booking-history" element={<BookingHistoryPage />} />
          <Route path="/my-bookings" element={<BookingHistoryPage />} />
          

          {/* 업체 */}
          <Route path="/companymanage" element={<CompanyManagePage />} />
          <Route path="/companyregister" element={<CompanyRegisterPage />} />
          <Route path="/companyregister/:id" element={<CompanyRegisterPage />} />
          <Route path="/companyform" element={<CompanyRegisterPage />} />
          <Route path="/companyform/:id" element={<CompanyRegisterPage />} />

          {/* 상품 */}
          <Route path="/product" element={<ProductManagePage />} />
          <Route path="/product/register" element={<ProductRegisterPage />} />
          <Route path="/product/edit/:productId" element={<ProductEditPage />} />
          
          {/* 리뷰 */}
          <Route path="/reviews/write" element={<ReviewWritePage />} />

          {/* 기타 */}
          <Route path="/notice" element={<Notice />} />
          <Route path="/event" element={<Event />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/copyrightpolicy" element={<CopyrightPolicy />} />
          <Route path="/operationpolicy" element={<OperationPolicy />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/inquiry" element={<Inquiry />} />
          <Route path="/customercenter" element={<CustomerCenter />} />
          <Route path="/test" element={<div>Test</div>} />

          {/* 없는 경로 */}
          <Route path="*" element={<Navigate to="/intro" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
