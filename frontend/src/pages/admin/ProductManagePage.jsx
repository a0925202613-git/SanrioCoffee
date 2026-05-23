import { useState, useEffect } from 'react';
import api from '../../api';

export default function ProductManagePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category_id: '', name: '', description: '', price: '', image_url: '' });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const refetch = () => {
    api.get('/products').then(r => setProducts(r.data.data || []));
    api.get('/categories').then(r => setCategories(r.data.data || []));
  };
  useEffect(() => { refetch(); }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = { ...form, category_id: Number(form.category_id), price: Number(form.price) };
      if (editing) { await api.put(`/products/${editing}`, payload); setMsg('success:更新成功'); }
      else          { await api.post('/products', payload);           setMsg('success:新增成功'); }
      setForm({ category_id: '', name: '', description: '', price: '', image_url: '' });
      setEditing(null);
      refetch();
    } catch (e) { setMsg('err:' + (e.response?.data?.message || '操作失敗')); }
  };

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({ category_id: p.category_id, name: p.name, description: p.description || '', price: p.price, image_url: p.image_url || '' });
  };

  const toggleAvail = async (p) => {
    await api.patch(`/products/${p.id}/availability`, { is_available: !p.is_available });
    refetch();
  };

  const del = async (id) => {
    if (!window.confirm('確定刪除此商品？')) return;
    await api.delete(`/products/${id}`);
    refetch();
  };

  const isSuccess = msg.startsWith('success:');
  const msgText = msg.replace(/^(success:|err:)/, '');

  return (
    <div className="page-wrap">
      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>商品管理</h2>

      <div className="card" style={{ marginBottom: 28 }}>
        <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: '1rem' }}>{editing ? '編輯商品' : '新增商品'}</h4>
        <form onSubmit={submit}>
          <div className="admin-form-grid">
            <select className="field" value={form.category_id} onChange={f('category_id')} required>
              <option value="">選擇分類</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="field" value={form.name} onChange={f('name')} placeholder="商品名稱" required />
            <input className="field" value={form.price} onChange={f('price')} placeholder="售價" type="number" min="0" required />
            <input className="field" value={form.image_url} onChange={f('image_url')} placeholder="圖片 URL（選填）" />
            <textarea className="field span-2" value={form.description} onChange={f('description')} placeholder="商品描述" rows={2} />

            {msg && (
              <p className="span-2" style={{ fontSize: '.875rem', color: isSuccess ? 'var(--green)' : 'var(--red)', background: isSuccess ? '#ECFDF5' : '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
                {msgText}
              </p>
            )}

            <div className="span-2" style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">{editing ? '更新' : '新增'}</button>
              {editing && (
                <button type="button" className="btn btn-outline"
                  onClick={() => { setEditing(null); setForm({ category_id: '', name: '', description: '', price: '', image_url: '' }); }}>
                  取消
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr>
            {['ID', '名稱', '分類', '價格', '狀態', '操作'].map(h => <th key={h}>{h}</th>)}
          </tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ color: 'var(--ink-2)', fontSize: '.8125rem' }}>{p.id}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td style={{ color: 'var(--ink-2)' }}>{categories.find(c => c.id === p.category_id)?.name || '—'}</td>
                <td style={{ fontWeight: 600 }}>NT$ {p.price}</td>
                <td>
                  <span className={p.is_available ? 'badge badge-ready' : 'badge badge-cancelled'}>
                    {p.is_available ? '上架' : '下架'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(p)} className="btn btn-outline btn-sm">編輯</button>
                    <button onClick={() => toggleAvail(p)} className={`btn btn-sm ${p.is_available ? 'btn-danger' : 'btn-accent'}`}>
                      {p.is_available ? '下架' : '上架'}
                    </button>
                    <button onClick={() => del(p.id)} className="btn btn-sm" style={{ background: 'var(--ink-3)', color: '#fff', border: 'none' }}>刪除</button>
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
