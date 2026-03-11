import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

const AdminExpenseReports: React.FC = () => {
    const { staff } = useAuth(); // current admin user
    const [claims, setClaims] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    // Fetch all staff for dropdown
    useEffect(() => {
        const fetchStaff = async () => {
            const { data } = await supabase.from('staff').select('id, name');
            setStaffList(data || []);
        };
        fetchStaff();
    }, []);

    const fetchClaims = async () => {
    let query = supabase.from('expense_claims').select('*, staff(name)');
    if (selectedStaff) query = query.eq('staff_id', selectedStaff);
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const firstDay = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
      query = query.gte('expense_date', firstDay).lte('expense_date', lastDay);
    }
    if (dateFrom) query = query.gte('expense_date', dateFrom);
    if (dateTo) query = query.lte('expense_date', dateTo);
    const { data } = await query.order('expense_date', { ascending: false });
    setClaims(data || []);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('expense_claims')
      .update({ 
        status: newStatus, 
        approved_by: staff?.id,
        approved_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) {
      alert('상태 업데이트 중 오류가 발생했습니다: ' + error.message);
    } else {
      fetchClaims();
    }
  };

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, selectedMonth, dateFrom, dateTo]);

  return (
    <div className="animate-fade" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h2>경비 보고 및 승인</h2>
        <p style={{ color: 'var(--text-muted)' }}>직원들이 신청한 경비를 조회하고 승인/반려 처리를 할 수 있습니다.</p>
      </header>

      <div className="glass" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>직원별 조회</label>
            <select className="input-field" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
              <option value="">전체 직원</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>월별 조회</label>
            <input type="month" className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>시작일</label>
            <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>종료일</label>
            <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--primary)', color: 'white' }}>
              <th style={{ padding: '16px' }}>직원명</th>
              <th style={{ padding: '16px' }}>금액</th>
              <th style={{ padding: '16px' }}>지출 일자</th>
              <th style={{ padding: '16px' }}>항목/설명</th>
              <th style={{ padding: '16px' }}>영수증</th>
              <th style={{ padding: '16px' }}>상태</th>
              <th style={{ padding: '16px' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px', fontWeight: '500' }}>{c.staff?.name || 'Unknown'}</td>
                <td style={{ padding: '16px' }}>{c.amount.toLocaleString()}원</td>
                <td style={{ padding: '16px' }}>{c.expense_date}</td>
                <td style={{ padding: '16px' }}>{c.description}</td>
                <td style={{ padding: '16px' }}>
                  {c.receipt_url ? (
                    <a href={c.receipt_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>보기</a>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>없음</span>}
                </td>
                <td style={{ padding: '16px' }}>
                  <span className="glass-pill" style={{
                    color: c.status === 'Approved' ? 'var(--success)' : c.status === 'Pending' ? 'var(--warning)' : 'var(--danger)',
                    fontSize: '0.85rem'
                  }}>
                    {c.status === 'Approved' ? '승인됨' : c.status === 'Pending' ? '대기중' : '반려됨'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  {c.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleStatusUpdate(c.id, 'Approved')}
                        className="btn btn-primary" 
                        style={{ padding: '4px 12px', fontSize: '0.8rem', background: 'var(--success)' }}
                      >
                        승인
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(c.id, 'Rejected')}
                        className="btn btn-secondary" 
                        style={{ padding: '4px 12px', fontSize: '0.8rem', color: 'var(--danger)' }}
                      >
                        반려
                      </button>
                    </div>
                  )}
                  {c.status !== 'Pending' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>완료</span>
                  )}
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  조회된 경비 신청 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminExpenseReports;
