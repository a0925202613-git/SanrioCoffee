import { useState, useEffect } from 'react';
import api from '../api';

const typeLabel = { earn: '獲得', redeem: '使用' };

export default function PointsPage() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/me/points').then(r => setData(r.data.data)); }, []);

  if (!data) return <p>載入中...</p>;

  return (
    <div>
      <h2>我的點數</h2>
      <div style={{ background: '#8B4513', color: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 14 }}>目前點數</p>
        <p style={{ margin: '8px 0 0', fontSize: 48, fontWeight: 'bold' }}>{data.current_points}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: .8 }}>每消費 NT$10 = 1 點，1 點 = 折抵 NT$1</p>
      </div>

      <h4>點數歷程</h4>
      {(data.transactions || []).length === 0 ? <p style={{ color: '#888' }}>尚無紀錄</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.transactions.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <span style={{ color: t.type === 'earn' ? 'green' : '#e77' }}>{typeLabel[t.type]}</span>
                <span style={{ marginLeft: 8, color: '#555', fontSize: 14 }}>{t.description}</span>
              </div>
              <div>
                <strong style={{ color: t.type === 'earn' ? 'green' : '#e77' }}>
                  {t.type === 'earn' ? '+' : '-'}{Math.abs(t.points_delta)} 點
                </strong>
                <span style={{ marginLeft: 8, color: '#aaa', fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString('zh-TW')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
