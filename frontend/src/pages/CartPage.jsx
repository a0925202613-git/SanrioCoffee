import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const navigate = useNavigate();

  const fetchCart = () => api.get('/cart').then(r => setCart(r.data.data));
  useEffect(() => { fetchCart(); }, []);

  const updateQty = async (itemId, qty) => {
    if (qty < 1) return;
    const item = cart.items.find(i => i.id === itemId);
    await api.put(`/cart/items/${itemId}`, { quantity: qty, customizations: item.customizations || [] });
    fetchCart();
  };

  const removeItem = async (itemId) => {
    await api.delete(`/cart/items/${itemId}`);
    fetchCart();
  };

  if (!cart) return (
    <div className="page-wrap-sm"><p className="loading-text">載入中...</p></div>
  );

  const hasItems = cart.items && cart.items.length > 0;

  return (
    <div className="page-wrap-sm">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>購物車</h2>

      {!hasItems ? (
        <div className="card empty-state">
          <div className="empty-state-icon">🛒</div>
          <p className="empty-state-text" style={{ marginBottom: 20 }}>購物車是空的</p>
          <button onClick={() => navigate('/menu')} className="btn btn-outline">前往菜單</button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            {cart.items.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 22px',
                borderBottom: idx < cart.items.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '.9375rem', marginBottom: 2 }}>{item.product_name}</p>
                  {item.customizations?.length > 0 && (
                    <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)', marginBottom: 4 }}>
                      {item.customizations.map(c => c.name).join(' · ')}
                    </p>
                  )}
                  <p style={{ fontWeight: 700, color: 'var(--amber)', fontSize: '.9375rem' }}>
                    NT$ {item.subtotal?.toFixed(0) ?? 0}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <button onClick={() => updateQty(item.id, item.quantity - 1)} style={qBtn}>−</button>
                  <span style={{ fontSize: '.9375rem', fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} style={qBtn}>+</button>
                </div>

                <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: '1.125rem', padding: '4px', flexShrink: 0, transition: 'color 150ms' }}
                  onMouseEnter={e => e.target.style.color = 'var(--red)'}
                  onMouseLeave={e => e.target.style.color = 'var(--ink-3)'}
                >✕</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div>
              <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)', marginBottom: 2 }}>合計</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em' }}>
                NT$ {cart.total_price?.toFixed(0) ?? 0}
              </p>
            </div>
            <button onClick={() => navigate('/checkout')} className="btn btn-primary btn-lg">
              前往結帳 →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const qBtn = {
  width: 30, height: 30,
  borderRadius: 6,
  border: '1.5px solid var(--line)',
  background: 'var(--surface)',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
