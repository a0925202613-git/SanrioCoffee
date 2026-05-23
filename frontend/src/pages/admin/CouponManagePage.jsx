import { useState, useEffect } from 'react';
import api from '../../api';

export default function CouponManagePage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', name: '', discount_type: 'fixed', discount_value: '', min_order_amount: 0, valid_from: '', valid_until: '', usage_limit: '' });
  const [msg, setMsg] = useState('');

  const refetch = () => api.get('/coupons').then(r => setCoupons(r.data.data || []));
  useEffect(() => { refetch(); }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
      };
      await api.post('/coupons', payload);
      setMsg('success:建立成功');
      setForm({ code: '', name: '', discount_type: 'fixed', discount_value: '', min_order_amount: 0, valid_from: '', valid_until: '', usage_limit: '' });
      refetch();
    } catch (e) { setMsg('err:' + (e.response?.data?.message || '建立失敗')); }
  };

  const toggleActive = async (c) => {
    await api.patch(`/coupons/${c.id}`, { is_active: !c.is_active });
    refetch();
  };

  const del = async (id) => {
    if (!window.confirm('確定刪除此優惠券？')) return;
    await api.delete(`/coupons/${id}`);
    refetch();
  };

  const isSuccess = msg.startsWith('success:');
  const msgText = msg.replace(/^(success:|err:)/, '');

  return (
    <div className="page-wrap">
      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>優惠券管理</h2>

      <div className="card" style={{ marginBottom: 28 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: '1rem' }}>新增優惠券</h4>
        <form onSubmit={submit}>
          <div className="admin-form-grid">
            <input className="field" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="折扣碼（大寫英數）" required />
            <input className="field" value={form.name} onChange={f('name')} placeholder="優惠券名稱" required />
            <select className="field" value={form.discount_type} onChange={f('discount_type')}>
              <option value="fixed">固定折扣（NT$）</option>
              <option value="percentage">百分比折扣（%）</option>
            </select>
            <input className="field" value={form.discount_value} onChange={f('discount_value')}
              placeholder={form.discount_type === 'fixed' ? '折扣金額' : '折扣 %（如 10 = 9折）'}
              type="number" min="0.01" required />
            <input className="field" value={form.min_order_amount} onChange={f('min_order_amount')} placeholder="最低消費（0=不限）" type="number" min="0" />
            <input className="field" value={form.usage_limit} onChange={f('usage_limit')} placeholder="使用上限（空白=無限）" type="number" min="1" />
            <input className="field" type="datetime-local" value={form.valid_from} onChange={f('valid_from')} required />
            <input className="field" type="datetime-local" value={form.valid_until} onChange={f('valid_until')} required />

            {msg && (
              <p className="span-2" style={{ fontSize: '.875rem', color: isSuccess ? 'var(--green)' : 'var(--red)', background: isSuccess ? '#ECFDF5' : '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
                {msgText}
              </p>
            )}
            <div className="span-2">
              <button type="submit" className="btn btn-primary">建立優惠券</button>
            </div>
          </div>
        </form>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr>
            {['代碼', '名稱', '折扣', '使用次數', '有效至', '狀態', '操作'].map(h => <th key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.id}>
                <td><code style={{ background: 'var(--bg)', padding: '3px 8px', borderRadius: 6, fontSize: '.8125rem', border: '1px solid var(--line)' }}>{c.code}</code></td>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>{c.discount_type === 'fixed' ? `NT$ ${c.discount_value}` : `${c.discount_value}%`}</td>
                <td style={{ color: 'var(--ink-2)' }}>{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
                <td style={{ color: 'var(--ink-2)', fontSize: '.8125rem' }}>{new Date(c.valid_until).toLocaleDateString('zh-TW')}</td>
                <td><span className={`badge ${c.is_active ? 'badge-ready' : 'badge-cancelled'}`}>{c.is_active ? '啟用' : '停用'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleActive(c)} className="btn btn-outline btn-sm">{c.is_active ? '停用' : '啟用'}</button>
                    <button onClick={() => del(c.id)} className="btn btn-danger btn-sm">刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
