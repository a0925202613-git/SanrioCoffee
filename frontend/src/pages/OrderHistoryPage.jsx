import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const statusLabel = { pending: '待付款', paid: '已付款', preparing: '準備中', ready: '待取餐', completed: '已完成', cancelled: '已取消' };
const statusColor = { pending: '#f5a623', paid: '#4a90e2', preparing: '#7b68ee', ready: '#50c878', completed: '#888', cancelled: '#e55' };

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { api.get('/orders').then(r => setOrders(r.data.data || [])); }, []);

  return (
    <div>
      <h2>我的訂單</h2>
      {orders.length === 0 ? <p style={{ color: '#888' }}>目前沒有訂單</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(o => (
            <div key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
              style={{ border: '1px solid #e0cfa9', borderRadius: 10, padding: 16, cursor: 'pointer', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><strong>訂單 #{o.id}</strong></span>
                <span style={{ background: statusColor[o.status], color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 13 }}>{statusLabel[o.status]}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                <span>NT$ {o.total_price?.toFixed(0) ?? 0}</span>
                <span style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString('zh-TW')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
