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

  if (!cart) return <p>載入中...</p>;

  return (
    <div>
      <h2>購物車</h2>
      {cart.items && cart.items.length > 0 ? (
        <>
          {cart.items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ flex: 1 }}>
                <strong>{item.product_name}</strong>
                {item.customizations?.length > 0 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {item.customizations.map(c => c.name).join(' / ')}
                  </div>
                )}
                <div style={{ color: '#8B4513', marginTop: 4 }}>NT$ {item.subtotal?.toFixed(0) ?? 0}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => updateQty(item.id, item.quantity - 1)} style={qBtn}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)} style={qBtn}>+</button>
              </div>
              <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#e55', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <strong style={{ fontSize: 20 }}>合計: NT$ {cart.total_price?.toFixed(0) ?? 0}</strong>
            <button onClick={() => navigate('/checkout')} style={checkoutBtn}>前往結帳</button>
          </div>
        </>
      ) : (
        <p style={{ color: '#888' }}>購物車是空的 <span style={{ cursor: 'pointer', color: '#8B4513' }} onClick={() => navigate('/menu')}>去逛逛</span></p>
      )}
    </div>
  );
}

const qBtn = { width: 28, height: 28, borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' };
const checkoutBtn = { padding: '10px 28px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' };
