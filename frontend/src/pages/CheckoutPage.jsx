import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [myCoupons, setMyCoupons] = useState([]); 
  const [pointsToUse, setPointsToUse] = useState(0);
  const [myPoints, setMyPoints] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cart').then(r => setCart(r.data.data));
    api.get('/me/points').then(r => setMyPoints(r.data.data?.current_points || 0));
    api.get('/coupons/my')
      .then(r => setMyCoupons(r.data.data || []))
      .catch(err => console.error("無法取得個人優惠券:", err));
  }, []);

  const validateCoupon = async (codeToValidate = couponCode) => {
    setError('');
    const targetCode = typeof codeToValidate === 'string' ? codeToValidate.trim() : couponCode.trim();
    if (!targetCode) return;
    
    try {
      const res = await api.post('/coupons/validate', { 
        code: targetCode, 
        order_total: cart?.total_price || 0 
      });
      setCouponResult(res.data.data);
    } catch (e) {
      setCouponResult(null);
      setError(e.response?.data?.message || '優惠券無效');
    }
  };

  const handleSelectCoupon = (code) => {
    setCouponCode(code);
    validateCoupon(code);
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

  if (!cart) return (
    <div className="page-wrap-sm"><p className="loading-text">載入中...</p></div>
  );

  return (
    <div className="page-wrap-sm">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>結帳</h2>

      {/* Order summary */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '.75rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 16 }}>
          訂單摘要 · {cart.total_items} 件
        </p>
        {(cart.items || []).map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '.875rem' }}>
            <span>{item.product_name} × {item.quantity}</span>
            <span style={{ fontWeight: 500 }}>NT$ {item.subtotal?.toFixed(0) ?? 0}</span>
          </div>
        ))}
        <hr className="divider" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label="小計" val={`NT$ ${subtotal.toFixed(0)}`} sub />
          {discount > 0    && <Row label="優惠券折扣" val={`-NT$ ${discount.toFixed(0)}`} green />}
          {pointsDiscount > 0 && <Row label="點數折抵" val={`-NT$ ${pointsDiscount}`} green />}
          <Row label="應付金額" val={`NT$ ${total.toFixed(0)}`} bold />
        </div>
      </div>

      {/* Coupon */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: '.9375rem', marginBottom: 12 }}>優惠券</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="輸入折扣碼" style={{ flex: 1 }} />
          <button onClick={() => validateCoupon(couponCode)} className="btn btn-outline" style={{ flexShrink: 0 }}>套用</button>
        </div>
        
        {/* 💡 新增：動態渲染「我的可用優惠券清單」 */}
        {myCoupons.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)', fontWeight: 500, marginBottom: 6 }}>
              您的可用優惠券 (點擊直接套用)：
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {myCoupons.map(cp => (
                <span
                  key={cp.id}
                  onClick={() => handleSelectCoupon(cp.code)}
                  style={{
                    fontSize: '.75rem',
                    padding: '4px 10px',
                    background: '#F3F4F6',
                    border: '1px dashed #D1D5DB',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: '#374151',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                  onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                >
                  🎫 {cp.code} <span style={{ color: 'var(--ink-2)' }}>({cp.name})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {couponResult && (
          <p style={{ marginTop: 12, fontSize: '.875rem', color: 'var(--green)', fontWeight: 500 }}>
            已套用：{couponResult.coupon.name}（折 NT$ {couponResult.discount_amount.toFixed(0)}）
          </p>
        )}
      </div>

      {/* Points */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: '.9375rem', marginBottom: 4 }}>使用點數</p>
        <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)', marginBottom: 12 }}>現有 {myPoints} 點，1 點 = NT$1</p>
        <input
          type="number" min={0} max={myPoints} className="field"
          value={pointsToUse}
          onChange={e => setPointsToUse(Number(e.target.value))}
          style={{ width: 160 }}
        />
      </div>

      {/* Note */}
      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontWeight: 600, fontSize: '.9375rem', marginBottom: 12 }}>備註</p>
        <textarea className="field" value={note} onChange={e => setNote(e.target.value)}
          rows={2} placeholder="例：不加冰塊、取餐備注..." />
      </div>

      {error && (
        <p style={{ fontSize: '.875rem', color: 'var(--red)', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <button onClick={placeOrder} className="btn btn-primary btn-full btn-lg">
        確認下單
      </button>
    </div>
  );
}

function Row({ label, val, sub, green, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: bold ? '.9375rem' : '.875rem', fontWeight: bold ? 700 : 400, color: green ? 'var(--green)' : sub ? 'var(--ink-2)' : 'var(--ink)' }}>
      <span>{label}</span><span>{val}</span>
    </div>
  );
}