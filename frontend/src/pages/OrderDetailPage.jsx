import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { statusLabel } from '../theme';

const badgeClass = { pending: 'badge-pending', paid: 'badge-paid', preparing: 'badge-preparing', ready: 'badge-ready', completed: 'badge-completed', cancelled: 'badge-cancelled' };

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
      setMsg('success');
    } catch (e) {
      setMsg(e.response?.data?.message || '取消失敗');
    }
  };

  if (!order) return <div className="page-wrap-sm"><p className="loading-text">載入中...</p></div>;

  return (
    <div className="page-wrap-sm" style={{ maxWidth: 580 }}>
      <button onClick={() => navigate('/orders')} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '.875rem', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← 返回訂單列表
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>訂單 #{order.id}</h2>
        <span className={`badge ${badgeClass[order.status] || 'badge-completed'}`}>{statusLabel[order.status]}</span>
      </div>

      {/* Meta */}
      <div className="card" style={{ marginBottom: 14, padding: '16px 22px' }}>
        <p style={{ fontSize: '.875rem', color: 'var(--ink-2)' }}>
          下單時間：{new Date(order.created_at).toLocaleString('zh-TW')}
        </p>
        {order.note && <p style={{ fontSize: '.875rem', color: 'var(--ink-2)', marginTop: 4 }}>備註：{order.note}</p>}
      </div>

      {/* Items */}
      <div className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)' }}>
          <p style={{ fontSize: '.75rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: 0 }}>商品明細</p>
        </div>
        {(order.items || []).map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 22px', borderBottom: idx < (order.items.length - 1) ? '1px solid var(--line)' : 'none' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '.9375rem', marginBottom: 2 }}>{item.product_name} × {item.quantity}</p>
              {item.customizations?.length > 0 && (
                <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)' }}>
                  {item.customizations.map(c => c.name).join(' · ')}
                </p>
              )}
            </div>
            <span style={{ fontWeight: 600, fontSize: '.9375rem', flexShrink: 0, marginLeft: 16 }}>
              NT$ {item.subtotal?.toFixed(0) ?? 0}
            </span>
          </div>
        ))}
        {/* Totals */}
        <div style={{ padding: '16px 22px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: 'var(--ink-2)' }}>
            <span>小計</span><span>NT$ {order.subtotal?.toFixed(0) ?? 0}</span>
          </div>
          {order.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: 'var(--green)' }}>
              <span>優惠券折扣</span><span>-NT$ {order.discount_amount?.toFixed(0) ?? 0}</span>
            </div>
          )}
          {order.points_used > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: 'var(--green)' }}>
              <span>點數折抵</span><span>-{order.points_used} 點</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.0625rem', paddingTop: 8, borderTop: '1px solid var(--line)', marginTop: 4 }}>
            <span>合計</span><span>NT$ {order.total_price?.toFixed(0) ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {msg === 'success' && <p style={{ fontSize: '.875rem', color: 'var(--green)', background: '#ECFDF5', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>訂單已取消</p>}
      {msg && msg !== 'success' && <p style={{ fontSize: '.875rem', color: 'var(--red)', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{msg}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {order.status === 'pending' && (
          <>
            <button onClick={() => navigate(`/payment/${order.id}`)} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
              前往付款
            </button>
            <button onClick={cancel} className="btn btn-danger">取消訂單</button>
          </>
        )}
        {order.status === 'paid' && (
          <button onClick={() => navigate(`/gifts/send/${order.id}`)} className="btn btn-accent">
            🎁 送出禮物
          </button>
        )}
      </div>
    </div>
  );
}
