import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PointsPage from './pages/PointsPage';
import SendGiftPage from './pages/SendGiftPage';
import ReceivedGiftsPage from './pages/ReceivedGiftsPage';
import ClaimGiftPage from './pages/ClaimGiftPage';
import ProductManagePage from './pages/admin/ProductManagePage';
import CategoryManagePage from './pages/admin/CategoryManagePage';
import OrderManagePage from './pages/admin/OrderManagePage';
import CouponManagePage from './pages/admin/CouponManagePage';

function ProtectedRoute({ children, adminOnly = false }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && role !== 'admin') return <Navigate to="/menu" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"          element={<Navigate to="/menu" />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/menu"      element={<MenuPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/cart"      element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="/checkout"  element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/payment/:orderId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/orders"    element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
        <Route path="/points"    element={<ProtectedRoute><PointsPage /></ProtectedRoute>} />
        <Route path="/gifts/send/:orderId" element={<ProtectedRoute><SendGiftPage /></ProtectedRoute>} />
        <Route path="/gifts/received"      element={<ProtectedRoute><ReceivedGiftsPage /></ProtectedRoute>} />
        <Route path="/gifts/claim"         element={<ProtectedRoute><ClaimGiftPage /></ProtectedRoute>} />
        <Route path="/admin/products"   element={<ProtectedRoute adminOnly><ProductManagePage /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute adminOnly><CategoryManagePage /></ProtectedRoute>} />
        <Route path="/admin/orders"     element={<ProtectedRoute adminOnly><OrderManagePage /></ProtectedRoute>} />
        <Route path="/admin/coupons"    element={<ProtectedRoute adminOnly><CouponManagePage /></ProtectedRoute>} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
