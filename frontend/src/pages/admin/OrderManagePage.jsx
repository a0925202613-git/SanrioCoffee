import { useState, useEffect } from 'react';
import api from '../../api';

const statusLabel = { pending: '待付款', paid: '已付款', preparing: '準備中', ready: '待取餐', completed: '已完成', cancelled: '已取消' };
const nextStatus = { paid: 'preparing', preparing: 'ready', ready: 'completed' };

export default function OrderManagePage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const fetch = () => {
    const params = filter ? `?status=${filter}` : '';
    api.get('/orders' + params).then(r => setOrders(r.data.data || []));
  };
  useEffect(() => { fetch(); }, [filter]);

  const advance = async (order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
      setMsg(`訂單 #${order.id} 狀態已更新為 ${statusLabel[next]}`);
      fetch();
    } catch (e) { setMsg(e.response?.data?.message || '更新失敗'); }
  };

  return (
    <div>
      <h2>訂單管理</h2>
      {msg && <p style={{ color: 'green' }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 16, border: '1px solid #8B4513', cursor: 'pointer', background: filter === s ? '#8B4513' : '#fff', color: filter === s ? '#fff' : '#8B4513' }}>
            {s ? statusLabel[s] : '全部'}
          </button>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead><tr style={{ background: '#f5deb3' }}>
          {['ID', '消費者', '金額', '狀態', '時間', '操作'].map(h => <th key={h} style={{ padding: 8, textAlign: 'left', border: '1px solid #e0cfa9' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td style={td}>#{o.id}</td>
              <td style={td}>用戶 #{o.user_id}</td>
              <td style={td}>NT$ {o.total_price?.toFixed(0) ?? 0}</td>
              <td style={td}><strong>{statusLabel[o.status]}</strong></td>
              <td style={td}>{new Date(o.created_at).toLocaleString('zh-TW')}</td>
              <td style={td}>
                {nextStatus[o.status] && (
                  <button onClick={() => advance(o)} style={{ padding: '4px 12px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    → {statusLabel[nextStatus[o.status]]}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p style={{ color: '#888' }}>沒有訂單</p>}
    </div>
  );
}

const td = { padding: '10px 8px', border: '1px solid #eee' };
