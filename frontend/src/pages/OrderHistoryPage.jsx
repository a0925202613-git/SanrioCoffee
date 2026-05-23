import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { statusLabel } from '../theme';

const badgeClass = { pending: 'badge-pending', paid: 'badge-paid', preparing: 'badge-preparing', ready: 'badge-ready', completed: 'badge-completed', cancelled: 'badge-cancelled' };

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { api.get('/orders').then(r => setOrders(r.data.data || [])); }, []);

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 660 }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>我的訂單</h2>

      {orders.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">目前沒有訂單</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {orders.map(o => (
            <div key={o.id} className="card" style={{ cursor: 'pointer', padding: '18px 22px', transition: 'box-shadow 200ms' }}
              onClick={() => navigate(`/orders/${o.id}`)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--sh-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--sh-sm)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>訂單 #{o.id}</span>
                <span className={`badge ${badgeClass[o.status] || 'badge-completed'}`}>{statusLabel[o.status]}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-.02em' }}>
                  NT$ {o.total_price?.toFixed(0) ?? 0}
                </span>
                <span style={{ fontSize: '.8125rem', color: 'var(--ink-2)' }}>
                  {new Date(o.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
