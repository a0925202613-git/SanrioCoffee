import { useState, useEffect } from 'react';
import api from '../../api';
import { statusLabel } from '../../theme';

const badgeClass = { pending: 'badge-pending', paid: 'badge-paid', preparing: 'badge-preparing', ready: 'badge-ready', completed: 'badge-completed', cancelled: 'badge-cancelled' };
const nextStatus = { paid: 'preparing', preparing: 'ready', ready: 'completed' };
const ALL = ['', 'pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled'];

export default function OrderManagePage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState('');

  const refetch = () => {
    const params = filter ? `?status=${filter}` : '';
    api.get('/orders' + params).then(r => setOrders(r.data.data || []));
  };
  useEffect(() => { refetch(); }, [filter]);

  const advance = async (order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
      setToast(`訂單 #${order.id} → ${statusLabel[next]}`);
      setTimeout(() => setToast(''), 3000);
      refetch();
    } catch (e) { setToast(e.response?.data?.message || '更新失敗'); }
  };

  return (
    <div className="page-wrap">
      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 24 }}>訂單管理</h2>

      {toast && (
        <div style={{ background: 'var(--ink)', color: 'var(--nav-text)', padding: '12px 20px', borderRadius: 10, marginBottom: 20, fontSize: '.875rem', fontWeight: 600 }}>
          {toast}
        </div>
      )}

      <div className="pill-row" style={{ paddingTop: 0, marginBottom: 24 }}>
        {ALL.map(s => (
          <button key={s} className={`pill${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s ? statusLabel[s] : '全部'}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr>
            {['訂單', '用戶', '金額', '狀態', '時間', '操作'].map(h => <th key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700 }}>#{o.id}</td>
                <td style={{ color: 'var(--ink-2)' }}>#{o.user_id}</td>
                <td style={{ fontWeight: 600 }}>NT$ {o.total_price?.toFixed(0) ?? 0}</td>
                <td><span className={`badge ${badgeClass[o.status] || 'badge-completed'}`}>{statusLabel[o.status]}</span></td>
                <td style={{ color: 'var(--ink-2)', fontSize: '.8125rem' }}>{new Date(o.created_at).toLocaleString('zh-TW')}</td>
                <td>
                  {nextStatus[o.status] && (
                    <button onClick={() => advance(o)} className="btn btn-primary btn-sm">
                      → {statusLabel[nextStatus[o.status]]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p style={{ color: 'var(--ink-2)', padding: '24px 0' }}>沒有符合的訂單</p>}
      </div>
    </div>
  );
}
