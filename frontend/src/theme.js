export const colors = {
  bg:         '#F7F5F2',
  surface:    '#FFFFFF',
  ink:        '#18161B',
  ink2:       '#6B6560',
  ink3:       '#AEA8A2',
  amber:      '#C07A3A',
  amberDk:    '#A0622E',
  amberLt:    '#F3E8D8',
  line:       '#E6DDD6',
  navBg:      '#18161B',
  navText:    '#F0EDE8',
  green:      '#2E7B56',
  red:        '#C1292E',
  // legacy aliases
  primary:    '#18161B',
  textMain:   '#18161B',
  textSub:    '#6B6560',
  border:     '#E6DDD6',
  success:    '#2E7B56',
  error:      '#C1292E',
};

export const statusColors = {
  pending:   { bg: '#FFF8E1', text: '#D97706' },
  paid:      { bg: '#EFF6FF', text: '#2563EB' },
  preparing: { bg: '#F5F3FF', text: '#6D28D9' },
  ready:     { bg: '#ECFDF5', text: '#059669' },
  completed: { bg: '#F3F4F6', text: '#6B7280' },
  cancelled: { bg: '#FEF2F2', text: '#DC2626' },
};

export const statusLabel = {
  pending: '待付款', paid: '已付款', preparing: '準備中',
  ready: '待取餐', completed: '已完成', cancelled: '已取消',
};

// Legacy inline style objects (kept for pages not yet fully migrated)
export const btn = {
  primary: { background: '#18161B', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  accent:  { background: '#C07A3A', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  outline: { background: 'transparent', color: '#18161B', border: '1.5px solid #18161B', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  danger:  { background: 'transparent', color: '#C1292E', border: '1.5px solid #C1292E', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' },
};

export const card = {
  background: '#FFFFFF',
  border: '1px solid #E6DDD6',
  borderRadius: 14,
  padding: '24px',
  boxShadow: '0 1px 3px rgba(24,22,27,.06)',
};

export const input = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #E6DDD6',
  borderRadius: 8,
  fontSize: 15,
  color: '#18161B',
  background: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
