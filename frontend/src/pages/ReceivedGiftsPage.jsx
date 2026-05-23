import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const giftBadge = {
  pending: { cls: 'badge-pending', label: '未領取' },
  claimed: { cls: 'badge-claimed', label: '已領取' },
  expired: { cls: 'badge-completed', label: '已過期' },
};

export default function ReceivedGiftsPage() {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/gifts/received')
      .then(r => setGifts(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 660 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>收到的禮物</h2>
        <button onClick={() => navigate('/gifts/claim')} className="btn btn-accent btn-sm">+ 領取禮物</button>
      </div>

      {loading && <p className="loading-text">載入中...</p>}

      {!loading && gifts.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">🎁</div>
          <p className="empty-state-text">還沒有收到禮物</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {gifts.map(gift => {
          const bd = giftBadge[gift.status] || { cls: 'badge-completed', label: gift.status };
          return (
            <div key={gift.id} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: 4 }}>
                    訂單 #{gift.order_id}
                  </p>
                  <p style={{ fontSize: '.8125rem', color: 'var(--ink-3)', marginBottom: gift.message ? 10 : 0, fontFamily: 'monospace', letterSpacing: '.04em' }}>
                    {gift.gift_code}
                  </p>
                  {gift.message && (
                    <p style={{ fontSize: '.875rem', color: 'var(--ink-2)', fontStyle: 'italic', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
                      "{gift.message}"
                    </p>
                  )}
                </div>
                <span className={`badge ${bd.cls}`}>{bd.label}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: '.8125rem', color: 'var(--ink-3)' }}>
                  {new Date(gift.created_at).toLocaleDateString('zh-TW')}
                </span>
                {gift.status === 'claimed' && (
                  <button onClick={() => navigate(`/orders/${gift.order_id}`)} className="btn btn-outline btn-sm">
                    查看訂單
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
