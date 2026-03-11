import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { Check, X, FileText, Eye, ExternalLink } from 'lucide-react';

const AdminExpenseReports: React.FC = () => {
  const { staff } = useAuth(); // current admin user
  const [claims, setClaims] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all staff for dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase.from('staff').select('id, name');
      setStaffList(data || []);
    };
    fetchStaff();
  }, []);

  const fetchClaims = async () => {
    try {
      // Fetch claims with requester info and their approval steps
      let query = supabase.from('expense_claims').select('*, requester:staff_id(name), approval_steps(*)');
      
      if (selectedStaff) query = query.eq('staff_id', selectedStaff);
      
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const y = parseInt(year);
        const m = parseInt(month);
        const firstDayStr = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const lastDayStr = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte('expense_date', firstDayStr).lte('expense_date', lastDayStr);
      }
      
      if (dateFrom) query = query.gte('expense_date', dateFrom);
      if (dateTo) query = query.lte('expense_date', dateTo);
      
      const { data, error } = await query.order('expense_date', { ascending: false });
      
      if (error) {
        console.error('Fetch claims error:', error);
        const { data: fallbackData } = await supabase.from('expense_claims').select('*').order('expense_date', { ascending: false });
        setClaims(fallbackData || []);
      } else {
        setClaims(data || []);
      }
    } catch (err) {
      console.error('Unexpected error in fetchClaims:', err);
    }
  };

  const handleStatusUpdate = async (claimId: string, newStatus: 'Approved' | 'Rejected') => {
    setActionLoading(true);
    try {
      // 1. Find the current pending step for THIS admin
      const { data: myStep, error: stepFindError } = await supabase
        .from('approval_steps')
        .select('*')
        .eq('request_id', claimId)
        .eq('approver_id', staff?.id)
        .eq('status', 'Pending')
        .order('step_order')
        .limit(1)
        .single();

      if (stepFindError || !myStep) {
        // Fallback for old system or if somehow direct approval is needed by super admin
        if (staff?.role_level === 'Admin') {
           const { error: directError } = await supabase.from('expense_claims').update({ status: newStatus, approved_by: staff?.id, approved_at: new Date().toISOString() }).eq('id', claimId);
           if (directError) throw directError;
        } else {
           alert('처리 가능한 결재 단계를 찾을 수 없습니다.');
           return;
        }
      } else {
        // 2. Update the specific step
        const { error: stepUpdateError } = await supabase
          .from('approval_steps')
          .update({ status: newStatus, processed_at: new Date().toISOString() })
          .eq('id', myStep.id);

        if (stepUpdateError) throw stepUpdateError;

        // 3. Update overall status
        if (newStatus === 'Rejected') {
          await supabase.from('expense_claims').update({ status: 'Rejected' }).eq('id', claimId);
        } else {
          // Check if this was the last step
          const { data: remainingSteps } = await supabase
            .from('approval_steps')
            .select('id')
            .eq('request_id', claimId)
            .eq('status', 'Pending');

          if (!remainingSteps || remainingSteps.length === 0) {
            await supabase.from('expense_claims').update({ 
              status: 'Approved', 
              approved_by: staff?.id, 
              approved_at: new Date().toISOString() 
            }).eq('id', claimId);
          }
        }
      }

      setIsModalOpen(false);
      setSelectedClaim(null);
      fetchClaims();
    } catch (err: any) {
      alert('상태 업데이트 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, selectedMonth, dateFrom, dateTo]);

  const openReviewModal = (claim: any) => {
    setSelectedClaim(claim);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-fade" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h2>개인경비 관리</h2>
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
                <td style={{ padding: '16px', fontWeight: '500' }}>{c.requester?.name || c.staff?.name || 'Unknown'}</td>
                <td style={{ padding: '16px' }}>{c.amount.toLocaleString()}원</td>
                <td style={{ padding: '16px' }}>{c.expense_date}</td>
                <td style={{ padding: '16px' }}>{c.description}</td>
                <td style={{ padding: '16px' }}>
                  {c.receipt_url ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', color: 'var(--primary)' }}>
                      <FileText size={16} />
                      <span style={{ fontSize: '0.8rem' }}>첨부됨</span>
                    </div>
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
                  <button 
                    onClick={() => openReviewModal(c)}
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    <Eye size={14} style={{ marginRight: '4px' }} />
                    {c.status === 'Pending' ? '검토/승인' : '상세보기'}
                  </button>
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  조회된 경비 신청 내역이 없습니다. (필터 설정을 확인해 주세요)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {isModalOpen && selectedClaim && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>경비 신청 상세 검토</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>신청자</p>
                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedClaim.staff?.name}</p>
              </div>
              <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>신청 금액</p>
                <p style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedClaim.amount.toLocaleString()}원</p>
              </div>
              <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>지출 일자</p>
                <p style={{ fontWeight: '500' }}>{selectedClaim.expense_date}</p>
              </div>
              <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>현재 상태</p>
                <span className="glass-pill" style={{
                    color: selectedClaim.status === 'Approved' ? 'var(--success)' : selectedClaim.status === 'Pending' ? 'var(--warning)' : 'var(--danger)',
                    fontSize: '0.85rem'
                  }}>
                    {selectedClaim.status === 'Approved' ? '승인됨' : selectedClaim.status === 'Pending' ? '대기중' : '반려됨'}
                </span>
              </div>
              <div className="glass" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', gridColumn: 'span 2' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>항목 및 목적</p>
                <p style={{ lineHeight: '1.5' }}>{selectedClaim.description}</p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>결재 라인 상태</p>
              <div className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                {selectedClaim.approval_steps?.sort((a: any, b: any) => a.step_order - b.step_order).map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: s.status === 'Approved' ? 'var(--success)' : s.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)', 
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {s.step_order}
                    </div>
                    <div style={{ flex: 1, fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '600' }}>{staffList.find(st => st.id === s.approver_id)?.name || 'Unknown'}</span>
                      <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                        {s.status === 'Approved' ? '승인완료' : s.status === 'Rejected' ? '보류/반려' : '대기중'}
                      </span>
                    </div>
                    {s.processed_at && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(s.processed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>영수증 증빙</p>
              {selectedClaim.receipt_url ? (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={selectedClaim.receipt_url} alt="Receipt" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', display: 'block' }} />
                  <a 
                    href={selectedClaim.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-secondary" 
                    style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.6)', color: 'white', backdropFilter: 'blur(4px)', border: 'none' }}
                  >
                    <ExternalLink size={14} style={{ marginRight: '4px' }} />
                    원본 보기
                   </a>
                </div>
              ) : (
                <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>첨부된 영수증이 없습니다.</p>
                </div>
              )}
            </div>

            {selectedClaim.status === 'Pending' && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button 
                  onClick={() => handleStatusUpdate(selectedClaim.id, 'Approved')}
                  disabled={actionLoading}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', background: 'var(--success)' }}
                >
                  <Check size={20} />
                  {actionLoading ? '처리중...' : '최종 승인'}
                </button>
                <button 
                  onClick={() => handleStatusUpdate(selectedClaim.id, 'Rejected')}
                  disabled={actionLoading}
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '12px', justifyContent: 'center', color: 'var(--danger)' }}
                >
                  <X size={20} />
                  반려 처리
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpenseReports;
