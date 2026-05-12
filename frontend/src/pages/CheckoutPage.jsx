import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [myPoints, setMyPoints] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cart').then(r => setCart(r.data.data));
    api.get('/me/points').then(r => setMyPoints(r.data.data?.current_points || 0));
  }, []);

  const validateCoupon = async () => {
    setError('');
    if (!couponCode) return;
    try {
      const res = await api.post('/coupons/validate', { code: couponCode, order_total: cart?.total_price || 0 });
      setCouponResult(res.data.data);
    } catch (e) {
      setCouponResult(null);
      setError(e.response?.data?.message || '優惠券無效');
    }
  };

  const subtotal = cart?.total_price || 0;
  const discount = couponResult?.discount_amount || 0;
  const pointsDiscount = Math.min(pointsToUse, myPoints, Math.max(0, subtotal - discount));
  const total = Math.max(0, subtotal - discount - pointsDiscount);

  const placeOrder = async () => {
    setError('');
    try {
      const res = await api.post('/orders', { coupon_code: couponCode, points_to_use: pointsToUse, note });
      navigate(`/payment/${res.data.data.id}`);
    } catch (e) {
      setError(e.response?.data?.message || '建立訂單失敗');
    }
  };

  if (!cart) return <p>載入中...</p>;

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h2>結帳</h2>
      <div style={{ background: '#fdf8f2', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h4 style={{ margin: '0 0 10px' }}>訂單摘要 ({cart.total_items} 件)</h4>
        {(cart.items || []).map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>{item.product_name} x{item.quantity}</span>
            <span>NT$ {item.subtotal?.toFixed(0) ?? 0}</span>
          </div>
        ))}
        <hr />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>小計</span><span>NT$ {subtotal.toFixed(0)}</span></div>
        {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'green' }}><span>優惠券折扣</span><span>-NT$ {discount.toFixed(0)}</span></div>}
        {pointsDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'green' }}><span>點數折抵</span><span>-NT$ {pointsDiscount}</span></div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 18, marginTop: 8 }}><span>應付金額</span><span>NT$ {total.toFixed(0)}</span></div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>優惠券代碼</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="輸入折扣碼" style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }} />
          <button onClick={validateCoupon} style={{ padding: '8px 16px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>套用</button>
        </div>
        {couponResult && <p style={{ color: 'green', margin: '4px 0' }}>折扣 NT$ {couponResult.discount_amount.toFixed(0)}（{couponResult.coupon.name}）</p>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>使用點數（現有 {myPoints} 點，1點=1元）</label>
        <input type="number" min={0} max={myPoints} value={pointsToUse} onChange={e => setPointsToUse(Number(e.target.value))}
          style={{ display: 'block', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc', width: 120 }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>備註</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="例：不加冰塊容器、外帶..." style={{ display: 'block', marginTop: 4, width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }} />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={placeOrder} style={{ width: '100%', padding: 12, background: '#8B4513', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>
        確認下單
      </button>
    </div>
  );
}
