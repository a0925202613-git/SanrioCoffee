import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function NavBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const [scrolled, setScrolled] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setGiftOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <nav className={`nav${scrolled ? ' nav-scrolled' : ''}`}>
      <Link to="/" className="nav-logo">
        <span>☕</span>
        <span>SANRIO COFFEE</span>
      </Link>

      <Link to="/menu" className="nav-link">Menu</Link>

      {token && role === 'consumer' && (
        <>
          <Link to="/cart"   className="nav-link">購物車</Link>
          <Link to="/orders" className="nav-link">我的訂單</Link>
          <Link to="/points" className="nav-link">點數</Link>

          <div className="nav-dropdown" ref={dropdownRef}>
            <button
              className="nav-link"
              onClick={() => setGiftOpen(o => !o)}
              aria-expanded={giftOpen}
            >
              禮物 <span style={{ fontSize: 9, opacity: .7 }}>▾</span>
            </button>
            {giftOpen && (
              <div className="nav-dropdown-menu" onClick={() => setGiftOpen(false)}>
                <Link to="/gifts/received" className="nav-dropdown-item">收到的禮物</Link>
                <Link to="/gifts/claim"    className="nav-dropdown-item">領取禮物</Link>
              </div>
            )}
          </div>
        </>
      )}

      {token && role === 'admin' && (
        <>
          <Link to="/admin/products"   className="nav-link nav-link-admin">商品</Link>
          <Link to="/admin/categories" className="nav-link nav-link-admin">分類</Link>
          <Link to="/admin/orders"     className="nav-link nav-link-admin">訂單</Link>
          <Link to="/admin/coupons"    className="nav-link nav-link-admin">優惠券</Link>
        </>
      )}

      <div className="nav-spacer" />

      {token
        ? <button onClick={logout} className="btn btn-ghost btn-sm">登出</button>
        : <Link to="/login" className="btn btn-ghost btn-sm">登入 / 註冊</Link>
      }
    </nav>
  );
}
