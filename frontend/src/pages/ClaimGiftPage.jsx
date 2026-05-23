import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ClaimGiftPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const claim = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.post('/gifts/claim', { gift_code: code.trim().toUpperCase() });
      setResult(r.data.data);
    } catch (e) {
      setError(e.response?.data?.message || '領取失敗，請確認代碼是否正確');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 480 }}>
      <button onClick={() => navigate('/gifts/received')} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '.875rem', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← 返回禮物列表
      </button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 6 }}>領取禮物</h2>
      <p style={{ color: 'var(--ink-2)', fontSize: '.9375rem', marginBottom: 28 }}>
        輸入對方分享給你的禮物代碼來領取。
      </p>

      {!result ? (
        <div className="card">
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">禮物代碼</label>
            <input
              className="field"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="SANRIO-PP-M8K9X2"
              onKeyDown={e => e.key === 'Enter' && claim()}
              style={{ fontFamily: 'monospace', letterSpacing: '.08em', fontSize: '1rem' }}
            />
          </div>
          {error && <p style={{ fontSize: '.875rem', color: 'var(--red)', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, marginBottom: 4 }}>{error}</p>}

          <button onClick={claim} disabled={loading || !code.trim()} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 20 }}>
            {loading ? '驗證中...' : '領取禮物'}
          </button>
        </div>
      ) : (
        <div className="card fade-up" style={{ textAlign: 'center', padding: '44px 28px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem' }}>🎉</div>
          <h3 style={{ fontWeight: 800, marginBottom: 8, fontSize: '1.25rem' }}>領取成功！</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: '.9375rem', marginBottom: 28 }}>
            訂單 #{result.order_id} 已轉移到你的帳號。
          </p>
          <button onClick={() => navigate(`/orders/${result.order_id}`)} className="btn btn-primary btn-lg">
            查看訂單 →
          </button>
        </div>
      )}
    </div>
  );
}
