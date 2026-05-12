import { useState, useEffect } from 'react';
import api from '../../api';

export default function CouponManagePage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: '', name: '', discount_type: 'fixed', discount_value: '', min_order_amount: 0, valid_from: '', valid_until: '', usage_limit: '' });
  const [msg, setMsg] = useState('');

  const fetch = () => api.get('/coupons').then(r => setCoupons(r.data.data || []));
  useEffect(() => { fetch(); }, []);

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
      setMsg('建立成功');
      setForm({ code: '', name: '', discount_type: 'fixed', discount_value: '', min_order_amount: 0, valid_from: '', valid_until: '', usage_limit: '' });
      fetch();
    } catch (e) { setMsg(e.response?.data?.message || '建立失敗'); }
  };

  const toggleActive = async (c) => {
    await api.patch(`/coupons/${c.id}`, { is_active: !c.is_active });
    fetch();
  };

  const del = async (id) => {
    if (!window.confirm('確定刪除優惠券？')) return;
    await api.delete(`/coupons/${id}`);
    fetch();
  };

  return (
    <div>
      <h2>優惠券管理</h2>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28, padding: 16, border: '1px solid #e0cfa9', borderRadius: 10 }}>
        <h4 style={{ gridColumn: '1/-1', margin: 0 }}>新增優惠券</h4>
        <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="折扣碼（大寫英數）" required style={inp} />
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="優惠券名稱" required style={inp} />
        <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} style={inp}>
          <option value="fixed">固定折扣（NT$）</option>
          <option value="percentage">百分比折扣（%）</option>
        </select>
        <input value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'fixed' ? '折扣金額' : '折扣 %（如 10 = 9折）'} type="number" min="0.01" required style={inp} />
        <input value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })} placeholder="最低消費金額（0=不限）" type="number" min="0" style={inp} />
        <input value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} placeholder="使用上限（空白=無限）" type="number" min="1" style={inp} />
        <input type="datetime-local" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} required style={inp} />
        <input type="datetime-local" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} required style={inp} />
        {msg && <p style={{ gridColumn: '1/-1', color: msg.includes('失敗') ? 'red' : 'green', margin: 0 }}>{msg}</p>}
        <button type="submit" style={btnP}>建立優惠券</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead><tr style={{ background: '#f5deb3' }}>
          {['代碼', '名稱', '折扣', '使用', '有效期', '狀態', '操作'].map(h => <th key={h} style={{ padding: 8, border: '1px solid #e0cfa9', textAlign: 'left' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {coupons.map(c => (
            <tr key={c.id}>
              <td style={td}><code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{c.code}</code></td>
              <td style={td}>{c.name}</td>
              <td style={td}>{c.discount_type === 'fixed' ? `NT$ ${c.discount_value}` : `${c.discount_value}%`}</td>
              <td style={td}>{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
              <td style={td}>{new Date(c.valid_until).toLocaleDateString('zh-TW')}</td>
              <td style={td}><span style={{ color: c.is_active ? 'green' : '#e55' }}>{c.is_active ? '啟用' : '停用'}</span></td>
              <td style={td}>
                <button onClick={() => toggleActive(c)} style={{ ...btnS, marginRight: 6 }}>{c.is_active ? '停用' : '啟用'}</button>
                <button onClick={() => del(c.id)} style={{ ...btnS, background: '#e55' }}>刪除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inp = { padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const btnP = { padding: '8px 20px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const btnS = { padding: '4px 12px', background: '#888', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const td = { padding: '10px 8px', border: '1px solid #eee' };
