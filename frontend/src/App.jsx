import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import PointsPage from './pages/PointsPage';
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

const bgDecos = [
  { char: '🎀', size: 90,  top: '8%',  left: '2%',   anim: 'float',     dur: '7s',   delay: '0s',   opacity: 0.12 },
  { char: '⭐', size: 66,  top: '22%', right: '2%',  anim: 'floatAlt',  dur: '8.5s', delay: '1.2s', opacity: 0.10 },
  { char: '🌸', size: 78,  top: '48%', left: '1.5%', anim: 'floatSlow', dur: '9s',   delay: '2s',   opacity: 0.11 },
  { char: '🍓', size: 62,  top: '68%', right: '2%',  anim: 'float',     dur: '6.5s', delay: '0.5s', opacity: 0.10 },
  { char: '🌙', size: 74,  top: '82%', left: '3%',   anim: 'floatAlt',  dur: '7.5s', delay: '3s',   opacity: 0.10 },
  { char: '🎀', size: 50,  top: '38%', right: '1.5%',anim: 'floatSlow', dur: '8s',   delay: '1.8s', opacity: 0.09 },
  { char: '✨', size: 54,  top: '13%', right: '9%',  anim: 'float',     dur: '6s',   delay: '2.5s', opacity: 0.12 },
  { char: '🌸', size: 58,  top: '75%', left: '12%',  anim: 'floatAlt',  dur: '8s',   delay: '0.8s', opacity: 0.09 },
  { char: '⭐', size: 48,  top: '55%', right: '8%',  anim: 'floatSlow', dur: '7s',   delay: '3.5s', opacity: 0.09 },
  { char: '🍓', size: 44,  top: '33%', left: '8%',   anim: 'float',     dur: '9s',   delay: '1.5s', opacity: 0.08 },
];

export default function App() {
  return (
    <BrowserRouter>
      {/* Floating Sanrio background decorations */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {bgDecos.map((d, i) => (
          <span key={i} style={{
            position: 'absolute',
            fontSize: d.size,
            top: d.top, left: d.left, right: d.right, bottom: d.bottom,
            opacity: d.opacity,
            animation: `${d.anim} ${d.dur} ease-in-out ${d.delay} infinite`,
            userSelect: 'none', lineHeight: 1,
          }}>{d.char}</span>
        ))}
      </div>

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <NavBar />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
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
            <Route path="/admin/products"   element={<ProtectedRoute adminOnly><ProductManagePage /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute adminOnly><CategoryManagePage /></ProtectedRoute>} />
            <Route path="/admin/orders"     element={<ProtectedRoute adminOnly><OrderManagePage /></ProtectedRoute>} />
            <Route path="/admin/coupons"    element={<ProtectedRoute adminOnly><CouponManagePage /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
