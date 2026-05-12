import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const statusLabel = { pending: '待付款', paid: '已付款', preparing: '準備中', ready: '待取餐', completed: '已完成', cancelled: '已取消' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchOrder = () => api.get(`/orders/${id}`).then(r => setOrder(r.data.data));
  useEffect(() => { fetchOrder(); }, [id]);

  const cancel = async () => {
    try {
      await api.patch(`/orders/${id}/cancel`);
      fetchOrder();
      setMsg('訂單已取消');
    } catch (e) {
      setMsg(e.response?.data?.message || '取消失敗');
    }
  };

  if (!order) return <p>載入中...</p>;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <button onClick={() => navigate('/orders')} style={{ background: 'none', border: 'none', color: '#8B4513', cursor: 'pointer', fontSize: 15, marginBottom: 12 }}>← 返回訂單列表</button>
      <h2>訂單 #{order.id}</h2>
      <p>狀態: <strong>{statusLabel[order.status]}</strong></p>
      <p>下單時間: {new Date(order.created_at).toLocaleString('zh-TW')}</p>
      {order.note && <p>備註: {order.note}</p>}

      <h4>商品明細</h4>
      {(order.items || []).map(item => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
          <div>
            <span>{item.product_name} x{item.quantity}</span>
            {item.customizations?.length > 0 && (
              <div style={{ fontSize: 12, color: '#888' }}>{item.customizations.map(c => c.name).join(' / ')}</div>
            )}
          </div>
          <span>NT$ {item.subtotal?.toFixed(0) ?? 0}</span>
        </div>
      ))}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span>小計: NT$ {order.subtotal?.toFixed(0) ?? 0}</span>
        {order.discount_amount > 0 && <span style={{ color: 'green' }}>優惠券: -NT$ {order.discount_amount?.toFixed(0) ?? 0}</span>}
        {order.points_used > 0 && <span style={{ color: 'green' }}>點數折抵: -{order.points_used} 點</span>}
        <strong style={{ fontSize: 20 }}>合計: NT$ {order.total_price?.toFixed(0) ?? 0}</strong>
      </div>

      {msg && <p style={{ color: msg.includes('失敗') ? 'red' : 'green', marginTop: 12 }}>{msg}</p>}
      {order.status === 'pending' && (
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={() => navigate(`/payment/${order.id}`)} style={{ flex: 1, padding: 12, background: '#8B4513', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
            前往付款
          </button>
          <button onClick={cancel} style={{ padding: '12px 20px', background: '#fff', color: '#e55', border: '1px solid #e55', borderRadius: 8, cursor: 'pointer' }}>
            取消訂單
          </button>
        </div>
      )}
    </div>
  );
}
