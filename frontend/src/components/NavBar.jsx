import { Link, useNavigate } from 'react-router-dom';

const navDecos = [
  { char: '🎀', size: 52, right: 320, top: -12, opacity: 0.18 },
  { char: '⭐', size: 36, right: 480, bottom: -8, opacity: 0.18 },
  { char: '🌸', size: 42, right: 180, top: -8, opacity: 0.15 },
  { char: '🍓', size: 34, right: 600, top: -6, opacity: 0.15 },
  { char: '🎀', size: 30, right: 760, bottom: -6, opacity: 0.12 },
];

export default function NavBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav style={{
      background: 'linear-gradient(90deg, #c94070 0%, #e05585 45%, #ef7fa4 100%)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 20, color: '#fff',
      boxShadow: '0 3px 12px rgba(200,60,110,0.35)',
      position: 'relative', overflow: 'hidden', height: 56,
      borderBottom: '3px solid rgba(255,255,255,0.25)',
    }}>

      {navDecos.map((d, i) => (
        <span key={i} style={{
          position: 'absolute', fontSize: d.size, opacity: d.opacity,
          right: d.right, top: d.top, bottom: d.bottom,
          pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}>{d.char}</span>
      ))}

      <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 20, display: 'flex', alignItems: 'center', gap: 6, zIndex: 1 }}>
        <span style={{ fontSize: 22 }}>🎀</span>
        <span>SanrioCoffee</span>
        <span style={{ fontSize: 18 }}>☕</span>
      </Link>

      <Link to="/menu" style={linkStyle}>菜單</Link>

      {token && role === 'consumer' && (
        <>
          <Link to="/cart"   style={linkStyle}>🛒 購物車</Link>
          <Link to="/orders" style={linkStyle}>📋 我的訂單</Link>
          <Link to="/points" style={linkStyle}>⭐ 點數</Link>
        </>
      )}

      {token && role === 'admin' && (
        <>
          <Link to="/admin/products"   style={adminLinkStyle}>商品管理</Link>
          <Link to="/admin/categories" style={adminLinkStyle}>分類管理</Link>
          <Link to="/admin/orders"     style={adminLinkStyle}>訂單管理</Link>
          <Link to="/admin/coupons"    style={adminLinkStyle}>優惠券</Link>
        </>
      )}

      <div style={{ marginLeft: 'auto', zIndex: 1 }}>
        {token
          ? <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.6)', color: '#fff', padding: '5px 14px', cursor: 'pointer', borderRadius: 20, fontSize: 13, backdropFilter: 'blur(4px)' }}>登出</button>
          : <Link to="/login" style={{ color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.5)', fontSize: 13 }}>登入/註冊</Link>
        }
      </div>
    </nav>
  );
}

const linkStyle = {
  color: '#fff', textDecoration: 'none', fontSize: 14, zIndex: 1,
  padding: '4px 10px', borderRadius: 16,
  transition: 'background .15s',
};

const adminLinkStyle = {
  color: '#ffe0ec', textDecoration: 'none', fontSize: 14, zIndex: 1,
  padding: '4px 10px', borderRadius: 16, fontWeight: 'bold',
};
