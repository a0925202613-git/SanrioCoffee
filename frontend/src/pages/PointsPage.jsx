import { useState, useEffect } from 'react';
import api from '../api';

const typeLabel = { earn: '獲得', redeem: '使用' };

export default function PointsPage() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/me/points').then(r => setData(r.data.data)); }, []);

  if (!data) return <div className="page-wrap-sm"><p className="loading-text">載入中...</p></div>;

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>我的點數</h2>

      {/* Points card */}
      <div style={{ background: 'var(--ink)', borderRadius: 16, padding: '36px 32px', textAlign: 'center', marginBottom: 28 }}>
        <p style={{ fontSize: '.8125rem', color: 'rgba(240,237,232,.50)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>累積點數</p>
        <p style={{ fontSize: '3.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 12 }}>
          {data.current_points}
        </p>
        <p style={{ fontSize: '.8125rem', color: 'rgba(240,237,232,.40)' }}>每消費 NT$10 = 1 點 · 1 點 = NT$1</p>
      </div>

      {/* History */}
      <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14, letterSpacing: '-.01em' }}>點數歷程</h4>

      {(data.transactions || []).length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">⭐</div>
          <p className="empty-state-text">尚無點數紀錄</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {data.transactions.map((t, idx) => (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 22px',
              borderBottom: idx < data.transactions.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.875rem', fontWeight: 600, color: t.type === 'earn' ? 'var(--green)' : 'var(--red)', marginBottom: 2 }}>
                  {t.type === 'earn' ? '▲' : '▼'} {typeLabel[t.type]}
                </span>
                <p style={{ fontSize: '.875rem', color: 'var(--ink-2)' }}>{t.description}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <p style={{ fontWeight: 800, fontSize: '1rem', color: t.type === 'earn' ? 'var(--green)' : 'var(--red)' }}>
                  {t.type === 'earn' ? '+' : '-'}{Math.abs(t.points_delta)}
                </p>
                <p style={{ fontSize: '.75rem', color: 'var(--ink-3)' }}>
                  {new Date(t.created_at).toLocaleDateString('zh-TW')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
