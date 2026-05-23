import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function SendGiftPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then(r => setOrder(r.data.data))
      .catch(() => setError('找不到此訂單'));
  }, [orderId]);

  const sendGift = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/gifts/send', { order_id: parseInt(orderId), message });
      setGiftCode(r.data.data.gift_code);
    } catch (e) {
      setError(e.response?.data?.message || '送出禮物失敗');
    } finally { setLoading(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(giftCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order && !error) return <div className="page-wrap-sm"><p className="loading-text">載入中...</p></div>;

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 520 }}>
      <button onClick={() => navigate(`/orders/${orderId}`)} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '.875rem', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← 返回訂單
      </button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 6 }}>送出禮物</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: '.9375rem', marginBottom: 28 }}>
        將訂單 #{orderId} 轉成禮物，產生禮物代碼分享給對方。
      </p>

      {error && <p style={{ fontSize: '.875rem', color: 'var(--red)', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, marginBottom: 20 }}>{error}</p>}

      {!giftCode ? (
        <div className="card">
          {order && (
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontWeight: 700, margin: '0 0 4px' }}>訂單 #{order.id}</p>
              <p style={{ color: 'var(--ink-2)', fontSize: '.875rem', margin: 0 }}>合計 NT$ {order.total_price?.toFixed(0)}</p>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">附上祝福留言（選填）</label>
            <textarea className="field" value={message} onChange={e => setMessage(e.target.value)}
              placeholder="寫一段祝福給對方..." rows={4} />
          </div>

          <button onClick={sendGift} disabled={loading} className="btn btn-accent btn-full btn-lg">
            {loading ? '處理中...' : '🎁 送出禮物'}
          </button>
        </div>
      ) : (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--amber-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem' }}>🎁</div>
          <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.25rem' }}>禮物已送出！</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: '.9375rem', marginBottom: 28 }}>
            將以下代碼分享給對方，對方可到「領取禮物」頁面輸入兌換。
          </p>

          <div style={{ background: 'var(--bg)', border: '2px dashed var(--amber)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <p style={{ margin: '0 0 6px', fontSize: '.75rem', color: 'var(--ink-2)', letterSpacing: '.06em', textTransform: 'uppercase' }}>禮物代碼</p>
            <p style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, letterSpacing: '.1em', color: 'var(--ink)' }}>{giftCode}</p>
          </div>

          <button onClick={copyCode} className="btn btn-outline" style={{ marginBottom: 12 }}>
            {copied ? '✓ 已複製' : '複製代碼'}
          </button>
          <br />
          <button onClick={() => navigate('/orders')} className="btn btn-primary" style={{ marginTop: 8 }}>
            返回訂單列表
          </button>
        </div>
      )}
    </div>
  );
}
