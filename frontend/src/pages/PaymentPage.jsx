import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const methodLabels = { credit_card: '信用卡', line_pay: 'LINE Pay', cash_on_pickup: '取餐付款' };
const methodIcons  = { credit_card: '💳', line_pay: '📱', cash_on_pickup: '💵' };

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order,   setOrder]   = useState(null);
  const [method,  setMethod]  = useState('credit_card');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(r => setOrder(r.data.data));
  }, [orderId]);

  // Auto-redirect countdown after payment result
  useEffect(() => {
    if (!result) return;

    const seconds = result.status === 'success' ? 3 : 5;
    setCountdown(seconds);

    let remaining = seconds;
    const interval = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (result.status === 'success') {
          navigate(`/orders/${orderId}`);
        } else {
          navigate('/orders');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [result]);

  const initiate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payments/initiate', { order_id: Number(orderId), method });
      setPayment(res.data.data);
    } catch (e) {
      alert(e.response?.data?.message || '發起付款失敗');
    } finally { setLoading(false); }
  };

  const simulate = async (forceResult) => {
    setLoading(true);
    try {
      const res = await api.post('/payments/callback', { transaction_id: payment.transaction_id, force_result: forceResult });
      setResult(res.data.data);
    } catch (e) {
      alert(e.response?.data?.message || '付款失敗');
    } finally { setLoading(false); }
  };

  const retry = () => {
    setPayment(null);
    setResult(null);
    setCountdown(null);
  };

  if (!order) return <p style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>載入中...</p>;

  return (
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      {/* Order summary card */}
      <div style={{ background: 'linear-gradient(135deg, #fff0f7, #fff8f0)', padding: 20, borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 12px rgba(200,60,110,0.1)', border: '1px solid #ffd6e7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>🎀</span>
          <span style={{ fontSize: 13, color: '#c94070', fontWeight: 'bold' }}>訂單 #{order.id}</span>
        </div>
        <p style={{ fontSize: 26, fontWeight: 'bold', color: '#c94070', margin: '0 0 4px' }}>
          NT$ {order.total_price?.toFixed(0) ?? 0}
        </p>
        <p style={{ fontSize: 13, color: '#888' }}>狀態：{order.status}</p>
      </div>

      {/* Step 1 – Choose payment method */}
      {!payment && !result && (
        <>
          <p style={{ fontWeight: 'bold', marginBottom: 10, color: '#444' }}>選擇付款方式</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            {Object.entries(methodLabels).map(([k, v]) => (
              <button key={k} onClick={() => setMethod(k)} style={{
                flex: 1, minWidth: 110, padding: '12px 8px', borderRadius: 12,
                border: method === k ? '2px solid #c94070' : '1.5px solid #e0c0cc',
                cursor: 'pointer',
                background: method === k ? 'linear-gradient(135deg, #c94070, #e05585)' : '#fff',
                color: method === k ? '#fff' : '#555',
                fontWeight: method === k ? 'bold' : 'normal',
                fontSize: 14, transition: 'all .15s',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{methodIcons[k]}</div>
                {v}
              </button>
            ))}
          </div>
          <button onClick={initiate} disabled={loading} style={{
            width: '100%', padding: 14,
            background: loading ? '#dda0b0' : 'linear-gradient(90deg, #c94070, #e05585)',
            color: '#fff', border: 'none', borderRadius: 12, fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 3px 10px rgba(200,60,110,0.3)',
          }}>
            {loading ? '處理中...' : '🎀 發起付款'}
          </button>
        </>
      )}

      {/* Step 2 – Mock payment page */}
      {payment && !result && (
        <div style={{ textAlign: 'center', padding: 28, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #ffd6e7' }}>
          <p style={{ fontSize: 48, marginBottom: 8 }}>{methodIcons[method]}</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>模擬金流付款中</p>
          <p style={{ fontWeight: 'bold', color: '#555', fontSize: 13, marginBottom: 4 }}>交易序號</p>
          <code style={{ background: '#f5f5f5', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#666', display: 'block', marginBottom: 20, wordBreak: 'break-all' }}>
            {payment.transaction_id}
          </code>
          <p style={{ color: '#c94070', fontSize: 13, marginBottom: 16 }}>🌸 請選擇模擬付款結果</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => simulate('success')} disabled={loading} style={{
              padding: '12px 28px', background: 'linear-gradient(90deg, #2e7d32, #43a047)',
              color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15,
              boxShadow: '0 2px 8px rgba(46,125,50,0.3)',
            }}>✅ 付款成功</button>
            <button onClick={() => simulate('failed')} disabled={loading} style={{
              padding: '12px 28px', background: 'linear-gradient(90deg, #b71c1c, #e53935)',
              color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15,
              boxShadow: '0 2px 8px rgba(183,28,28,0.3)',
            }}>❌ 付款失敗</button>
          </div>
        </div>
      )}

      {/* Step 3 – Result with countdown redirect */}
      {result && (
        <div style={{ textAlign: 'center', padding: 36, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: `1px solid ${result.status === 'success' ? '#c8e6c9' : '#ffcdd2'}` }}>
          {result.status === 'success' ? (
            <>
              <p style={{ fontSize: 64, marginBottom: 8 }}>🎉</p>
              <h3 style={{ color: '#2e7d32', fontSize: 22, marginBottom: 8 }}>付款成功！</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>感謝您的惠顧 🎀</p>
              <p style={{ color: '#888', fontSize: 13 }}>
                {countdown > 0
                  ? `${countdown} 秒後自動跳至訂單詳情...`
                  : '跳轉中...'}
              </p>
              <button onClick={() => navigate(`/orders/${orderId}`)} style={{
                marginTop: 20, padding: '10px 28px',
                background: 'linear-gradient(90deg, #c94070, #e05585)',
                color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14,
              }}>立即查看訂單 →</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 64, marginBottom: 8 }}>😢</p>
              <h3 style={{ color: '#b71c1c', fontSize: 22, marginBottom: 8 }}>付款失敗</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>請檢查付款資訊後重試</p>
              <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
                {countdown > 0
                  ? `${countdown} 秒後返回訂單列表...`
                  : '跳轉中...'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={retry} style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(90deg, #c94070, #e05585)',
                  color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14,
                }}>🔄 重新付款</button>
                <button onClick={() => navigate('/orders')} style={{
                  padding: '10px 24px', background: '#fff',
                  color: '#888', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', fontSize: 14,
                }}>查看訂單列表</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
