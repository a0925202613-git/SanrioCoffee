import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    api.get(`/products/${id}`).then(r => setProduct(r.data.data));
  }, [id]);

  if (!product) return (
    <div className="page-wrap-sm">
      <p className="loading-text">載入中...</p>
    </div>
  );

  const groups = {};
  (product.customizations || []).forEach(c => {
    if (!groups[c.option_type]) groups[c.option_type] = [];
    groups[c.option_type].push(c);
  });

  // 💡 這裡有對照表，儲存成功後就不會再出現英文大寫 FLAVOR 了
  const typeLabel = { size: '杯型', ice: '冰量', sugar: '甜度', addon: '加料', flavor: '更換風味' };
  
  // 💡 這裡控制黃金排序：杯型 ➡️ 甜度 ➡️ 冰量 ➡️ 加料 ➡️ 更換風味
  const groupOrder = ['size', 'sugar', 'ice', 'addon', 'flavor'];

  const selectOption = (type, option) => {
    setSelectedOptions(prev => {
      if (type === 'addon') {
        const cur = prev[type] || [];
        const exists = cur.find(o => o.name === option.name);
        return { ...prev, [type]: exists ? cur.filter(o => o.name !== option.name) : [...cur, option] };
      }
      return { ...prev, [type]: option };
    });
  };

  const isSelected = (type, option) => {
    if (type === 'addon') return (selectedOptions[type] || []).some(o => o.name === option.name);
    return selectedOptions[type]?.name === option.name;
  };

  const totalExtra = Object.entries(selectedOptions).reduce((sum, [type, val]) => {
    if (type === 'addon') return sum + val.reduce((s, o) => s + o.price_delta, 0);
    return sum + (val?.price_delta || 0);
  }, 0);
  const unitPrice = product.price + totalExtra;

  const addToCart = async () => {
    if (!token || role !== 'consumer') { navigate('/login'); return; }
    const customizations = [];
    Object.entries(selectedOptions).forEach(([type, val]) => {
      if (type === 'addon') val.forEach(o => customizations.push({ option_type: type, name: o.name, price_delta: o.price_delta }));
      else if (val) customizations.push({ option_type: type, name: val.name, price_delta: val.price_delta });
    });
    try {
      await api.post('/cart/items', { product_id: product.id, quantity, customizations });
      setMsg('success');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg(e.response?.data?.message || '加入失敗');
    }
  };

  return (
    <div className="page-wrap-sm">
      <button
        onClick={() => navigate('/menu')}
        style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: '.875rem', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← 返回菜單
      </button>

      {/* Image */}
      {product.image_url
        ? <img src={product.image_url} alt={product.name} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 14, marginBottom: 28 }} />
        : <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(135deg, #EDE5D8, #F3EAE0)', borderRadius: 14, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, color: 'var(--ink-3)' }}>☕</div>
      }

      {/* Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.02em' }}>{product.name}</h1>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber)', flexShrink: 0, marginLeft: 12 }}>NT$ {product.price}</span>
      </div>
      {product.description && (
        <p style={{ color: 'var(--ink-2)', fontSize: '.9375rem', marginBottom: 28, lineHeight: 1.7 }}>{product.description}</p>
      )}

      {/* Customizations */}
      {groupOrder.map(type => {
        const options = groups[type];
        if (!options || options.length === 0) return null;

        return (
          <div key={type} style={{ marginBottom: 22 }}>
            <p style={{ fontWeight: 600, fontSize: '.875rem', letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 10 }}>
              {typeLabel[type] || type}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {options.map(o => {
                const sel = isSelected(type, o);
                return (
                  <button 
                    key={o.id} 
                    onClick={() => selectOption(type, o)} 
                    disabled={o.is_disabled}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--r-full)',
                      border: sel ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                      background: sel ? 'var(--ink)' : 'var(--surface)',
                      color: sel ? '#fff' : 'var(--ink)',
                      cursor: 'pointer',
                      fontSize: '.875rem',
                      fontWeight: sel ? 600 : 400,
                      transition: 'all 200ms',
                      ...(o.is_disabled && {
                        background: '#EFEBE5',
                        color: 'var(--ink-3)',
                        border: '1.5px solid var(--line)',
                        cursor: 'not-allowed',
                        pointerEvents: 'none',
                        opacity: 0.5,
                      })
                    }}
                  >
                    {o.name}{o.price_delta > 0 ? ` +${o.price_delta}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
        <span style={{ fontWeight: 600, fontSize: '.875rem', letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>數量</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={qBtn}>−</button>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{quantity}</span>
          <button onClick={() => setQuantity(q => q + 1)} style={qBtn}>+</button>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
          NT$ {(unitPrice * quantity).toFixed(0)}
        </span>
      </div>

      {msg === 'success' && (
        <p style={{ fontSize: '.875rem', color: 'var(--green)', background: '#ECFDF5', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
          已加入購物車！
        </p>
      )}
      {msg && msg !== 'success' && (
        <p style={{ fontSize: '.875rem', color: 'var(--red)', background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
          {msg}
        </p>
      )}

      <button onClick={addToCart} className="btn btn-primary btn-full btn-lg">
        加入購物車
      </button>
    </div>
  );
}

const qBtn = {
  width: 34, height: 34,
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--line)',
  background: 'var(--surface)',
  cursor: 'pointer',
  fontSize: '1.125rem',
  fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 200ms',
};