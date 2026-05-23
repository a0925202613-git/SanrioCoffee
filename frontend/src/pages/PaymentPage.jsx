import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const methodLabels = { credit_card: '信用卡', line_pay: 'LINE Pay', cash_on_pickup: '取餐付款' };
const methodIcons  = { credit_card: '💳', line_pay: '📱', cash_on_pickup: '💵' };

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order,     setOrder]     = useState(null);
  const [method,    setMethod]    = useState('credit_card');
  const [payment,   setPayment]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(r => setOrder(r.data.data));
  }, [orderId]);

  useEffect(() => {
    if (!result) return;
    const seconds = result.status === 'success' ? 3 : 5;
    setCountdown(seconds);
    let rem = seconds;
    const t = setInterval(() => {
      rem -= 1;
      setCountdown(rem);
      if (rem <= 0) { clearInterval(t); navigate(result.status === 'success' ? `/orders/${orderId}` : '/orders'); }
    }, 1000);
    return () => clearInterval(t);
  }, [result]);

  const initiate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payments/initiate', { order_id: Number(orderId), method });
      setPayment(res.data.data);
    } catch (e) { alert(e.response?.data?.message || '發起付款失敗'); }
    finally { setLoading(false); }
  };

  const simulate = async (force) => {
    setLoading(true);
    try {
      const res = await api.post('/payments/callback', { transaction_id: payment.transaction_id, force_result: force });
      setResult(res.data.data);
    } catch (e) { alert(e.response?.data?.message || '付款失敗'); }
    finally { setLoading(false); }
  };

  if (!order) return <div className="page-wrap-sm"><p className="loading-text">載入中...</p></div>;

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 480 }}>

      {/* Order card */}
      <div className="card" style={{ marginBottom: 28, background: 'var(--ink)', border: 'none' }}>
        <p style={{ fontSize: '.8125rem', color: 'rgba(240,237,232,.50)', marginBottom: 6, letterSpacing: '.04em' }}>
          訂單 #{order.id}
        </p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-.03em', margin: 0 }}>
          NT$ {order.total_price?.toFixed(0) ?? 0}
        </p>
      </div>

      {/* Step 1 – method */}
      {!payment && !result && (
        <>
          <p style={{ fontWeight: 700, fontSize: '.875rem', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 14 }}>
            選擇付款方式
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {Object.entries(methodLabels).map(([k, v]) => {
              const sel = method === k;
              return (
                <button key={k} onClick={() => setMethod(k)} style={{
                  padding: '16px 8px',
                  borderRadius: 12,
                  border: `2px solid ${sel ? 'var(--ink)' : 'var(--line)'}`,
                  background: sel ? 'var(--ink)' : 'var(--surface)',
                  color: sel ? '#fff' : 'var(--ink-2)',
                  cursor: 'pointer',
                  fontSize: '.875rem',
                  fontWeight: sel ? 700 : 400,
                  transition: 'all 200ms',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{methodIcons[k]}</span>
                  {v}
                </button>
              );
            })}
          </div>
          <button onClick={initiate} disabled={loading} className="btn btn-primary btn-full btn-lg">
            {loading ? '處理中...' : '確認付款'}
          </button>
        </>
      )}

      {/* Step 2 – mock payment */}
      {payment && !result && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 28px' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: 8 }}>{methodIcons[method]}</p>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>模擬金流付款</p>
          <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)', marginBottom: 20 }}>Transaction ID</p>
          <code style={{ background: 'var(--bg)', padding: '8px 14px', borderRadius: 8, fontSize: '.8125rem', color: 'var(--ink-2)', display: 'block', marginBottom: 28, wordBreak: 'break-all', border: '1px solid var(--line)' }}>
            {payment.transaction_id}
          </code>
          <p style={{ fontSize: '.875rem', color: 'var(--ink-2)', marginBottom: 16 }}>選擇模擬結果</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => simulate('success')} disabled={loading}
              style={{ flex: 1, padding: '13px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.9375rem' }}>
              付款成功
            </button>
            <button onClick={() => simulate('failed')} disabled={loading}
              style={{ flex: 1, padding: '13px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.9375rem' }}>
              付款失敗
            </button>
          </div>
        </div>
      )}

      {/* Step 3 – result */}
      {result && (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '44px 28px' }}>
          {result.status === 'success' ? (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '1.75rem' }}>✓</div>
              <h3 style={{ fontWeight: 800, color: 'var(--green)', marginBottom: 8, fontSize: '1.25rem' }}>付款成功！</h3>
              <p style={{ color: 'var(--ink-2)', fontSize: '.875rem', marginBottom: 4 }}>感謝您的惠顧</p>
              <p style={{ color: 'var(--ink-3)', fontSize: '.8125rem', marginBottom: 24 }}>
                {countdown > 0 ? `${countdown} 秒後自動跳轉...` : '跳轉中...'}
              </p>
              <button onClick={() => navigate(`/orders/${orderId}`)} className="btn btn-primary">
                查看訂單
              </button>
            </>
          ) : (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '1.75rem' }}>✕</div>
              <h3 style={{ fontWeight: 800, color: 'var(--red)', marginBottom: 8, fontSize: '1.25rem' }}>付款失敗</h3>
              <p style={{ color: 'var(--ink-2)', fontSize: '.875rem', marginBottom: 4 }}>請確認付款資訊後重試</p>
              <p style={{ color: 'var(--ink-3)', fontSize: '.8125rem', marginBottom: 24 }}>
                {countdown > 0 ? `${countdown} 秒後返回訂單...` : '跳轉中...'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => { setPayment(null); setResult(null); }} className="btn btn-primary">重新付款</button>
                <button onClick={() => navigate('/orders')} className="btn btn-outline">查看訂單</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
