import { useState, useEffect } from 'react';
import api from '../../api';

const OPTION_TYPE_LABEL = {
  ice: '冰量', sugar: '甜度', size: '杯型', addon: '加料', flavor: '風味',
};

// ─── 商品管理 Tab ──────────────────────────────────────────────
function ProductTab() {
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
    <>
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
    </>
  );
}

// ─── 客製化群組 Tab ──────────────────────────────────────────────
function GroupsTab() {
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [addForms, setAddForms] = useState({});      // { groupId: { name, price_delta, sort_order } }
  const [addMsgs, setAddMsgs] = useState({});
  const [bindProductId, setBindProductId] = useState('');
  const [boundIds, setBoundIds] = useState([]);       // group ids currently bound to selected product
  const [bindMsg, setBindMsg] = useState('');

  const fetchGroups = () => api.get('/customization-groups').then(r => setGroups(r.data.data || []));
  const fetchProducts = () => api.get('/products').then(r => setProducts(r.data.data || []));

  useEffect(() => { fetchGroups(); fetchProducts(); }, []);

  useEffect(() => {
    if (!bindProductId) { setBoundIds([]); return; }
    api.get(`/products/${bindProductId}/customization-groups`)
      .then(r => setBoundIds(r.data.data || []));
  }, [bindProductId]);

  // ── 新增選項 ──
  const getAddForm = (gid) => addForms[gid] || { name: '', price_delta: '', sort_order: '' };
  const setAddForm = (gid, patch) =>
    setAddForms(p => ({ ...p, [gid]: { ...getAddForm(gid), ...patch } }));

  const submitAddItem = async (e, gid) => {
    e.preventDefault();
    const f = getAddForm(gid);
    try {
      await api.post(`/customization-groups/${gid}/items`, {
        name: f.name,
        price_delta: Number(f.price_delta) || 0,
        sort_order: Number(f.sort_order) || 0,
      });
      setAddForms(p => ({ ...p, [gid]: { name: '', price_delta: '', sort_order: '' } }));
      setAddMsgs(p => ({ ...p, [gid]: 'success:新增成功' }));
      fetchGroups();
    } catch (err) {
      setAddMsgs(p => ({ ...p, [gid]: 'err:' + (err.response?.data?.message || '新增失敗') }));
    }
    setTimeout(() => setAddMsgs(p => ({ ...p, [gid]: '' })), 3000);
  };

  const deleteItem = async (gid, itemId) => {
    if (!window.confirm('確定刪除此選項？')) return;
    await api.delete(`/customization-groups/${gid}/items/${itemId}`);
    fetchGroups();
  };

  // ── 綁定群組 ──
  const toggleBound = async (groupId) => {
    if (!bindProductId) return;
    const already = boundIds.includes(groupId);
    try {
      if (already) {
        await api.delete(`/products/${bindProductId}/customization-groups/${groupId}`);
        setBoundIds(p => p.filter(id => id !== groupId));
        setBindMsg('success:已解除綁定');
      } else {
        await api.post(`/products/${bindProductId}/customization-groups`, { group_id: groupId });
        setBoundIds(p => [...p, groupId]);
        setBindMsg('success:綁定成功');
      }
    } catch (err) {
      setBindMsg('err:' + (err.response?.data?.message || '操作失敗'));
    }
    setTimeout(() => setBindMsg(''), 3000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* 左：群組選項管理 */}
      <div>
        <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>群組選項管理</h4>
        {groups.map(g => {
          const f = getAddForm(g.id);
          const msg = addMsgs[g.id] || '';
          const isOk = msg.startsWith('success:');
          return (
            <div key={g.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontSize: '.75rem', fontWeight: 700, padding: '2px 8px',
                  borderRadius: 99, background: 'var(--amber-lt)', color: 'var(--amber-dk)',
                }}>
                  {OPTION_TYPE_LABEL[g.option_type] || g.option_type}
                </span>
                <span style={{ fontWeight: 700 }}>{g.name}</span>
                <span style={{ color: 'var(--ink-3)', fontSize: '.8125rem', marginLeft: 'auto' }}>ID: {g.id}</span>
              </div>

              {/* 現有選項 */}
              {g.items.length === 0
                ? <p style={{ color: 'var(--ink-3)', fontSize: '.875rem', marginBottom: 12 }}>尚無選項</p>
                : (
                  <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {g.items.map(item => (
                      <span key={item.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: '.8125rem', padding: '3px 10px',
                        borderRadius: 99, background: 'var(--bg)', border: '1px solid var(--line)',
                      }}>
                        {item.name}
                        {item.price_delta > 0 && <span style={{ color: 'var(--amber-dk)' }}>+{item.price_delta}</span>}
                        <button
                          onClick={() => deleteItem(g.id, item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: '0 2px', lineHeight: 1 }}
                        >×</button>
                      </span>
                    ))}
                  </div>
                )
              }

              {/* 新增選項表單 */}
              <form onSubmit={e => submitAddItem(e, g.id)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px auto', gap: 6, alignItems: 'center' }}>
                <input className="field" style={{ fontSize: '.8125rem', padding: '6px 10px' }}
                  placeholder="選項名稱" value={f.name}
                  onChange={e => setAddForm(g.id, { name: e.target.value })} required />
                <input className="field" style={{ fontSize: '.8125rem', padding: '6px 10px' }}
                  placeholder="加價" type="number" step="0.01" value={f.price_delta}
                  onChange={e => setAddForm(g.id, { price_delta: e.target.value })} />
                <input className="field" style={{ fontSize: '.8125rem', padding: '6px 10px' }}
                  placeholder="順序" type="number" value={f.sort_order}
                  onChange={e => setAddForm(g.id, { sort_order: e.target.value })} />
                <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>+ 新增</button>
              </form>

              {msg && (
                <p style={{ marginTop: 6, fontSize: '.8125rem', color: isOk ? 'var(--green)' : 'var(--red)' }}>
                  {msg.replace(/^(success:|err:)/, '')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 右：商品群組綁定 */}
      <div>
        <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>商品群組綁定</h4>
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 600, marginBottom: 6 }}>選擇商品</label>
            <select className="field" value={bindProductId} onChange={e => setBindProductId(e.target.value)}>
              <option value="">— 請選擇商品 —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {bindProductId
            ? (
              <>
                <p style={{ fontSize: '.8125rem', color: 'var(--ink-2)', marginBottom: 12 }}>
                  勾選後立即生效，無需另外儲存
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {groups.map(g => {
                    const checked = boundIds.includes(g.id);
                    return (
                      <label key={g.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${checked ? 'var(--amber)' : 'var(--line)'}`,
                        background: checked ? 'var(--amber-lt)' : 'var(--surface)',
                        transition: 'all 150ms',
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBound(g.id)}
                          style={{ accentColor: 'var(--amber)', width: 16, height: 16 }}
                        />
                        <span style={{ fontWeight: checked ? 700 : 400 }}>{g.name}</span>
                        <span style={{
                          marginLeft: 'auto', fontSize: '.75rem', fontWeight: 600,
                          padding: '1px 7px', borderRadius: 99,
                          background: 'var(--bg)', color: 'var(--ink-2)',
                        }}>
                          {OPTION_TYPE_LABEL[g.option_type] || g.option_type}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {bindMsg && (
                  <p style={{
                    marginTop: 12, fontSize: '.875rem', padding: '8px 12px', borderRadius: 8,
                    color: bindMsg.startsWith('success:') ? 'var(--green)' : 'var(--red)',
                    background: bindMsg.startsWith('success:') ? '#ECFDF5' : '#FEF2F2',
                  }}>
                    {bindMsg.replace(/^(success:|err:)/, '')}
                  </p>
                )}
              </>
            )
            : <p style={{ color: 'var(--ink-3)', fontSize: '.875rem' }}>請先選擇一個商品</p>
          }
        </div>
      </div>
    </div>
  );
}

// ─── 主頁面 ──────────────────────────────────────────────────────
export default function ProductManagePage() {
  const [activeTab, setActiveTab] = useState('products');

  const tabs = [
    { key: 'products', label: '商品管理' },
    { key: 'groups',   label: '客製化群組' },
  ];

  return (
    <div className="page-wrap">
      <h2 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 28 }}>商品管理</h2>

      {/* Tab 切換列 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid var(--line)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '.9375rem', fontWeight: activeTab === t.key ? 700 : 400,
              color: activeTab === t.key ? 'var(--ink)' : 'var(--ink-2)',
              padding: '10px 18px',
              borderBottom: activeTab === t.key ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -2,
              transition: 'all 150ms',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'products' && <ProductTab />}
      {activeTab === 'groups'   && <GroupsTab />}
    </div>
  );
}
