import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { Send } from 'lucide-react';
import ApprovalLinePicker from './ApprovalLinePicker';

const ExpenseRequest: React.FC = () => {
  const { staff } = useAuth();
  const [amount, setAmount] = useState(''); // Stores formatted string for display
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [approvalLine, setApprovalLine] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myClaims, setMyClaims] = useState<any[]>([]);

  // Helper to format number with commas
  const formatNumber = (val: string) => {
    if (!val) return '';
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Helper to remove commas
  const unformatNumber = (val: string) => val.replace(/,/g, '');

  const fetchMyClaims = async () => {
    if (!staff?.id) return;
    const { data } = await supabase
      .from('expense_claims')
      .select('*')
      .eq('staff_id', staff.id)
      .order('date_submitted', { ascending: false });
    setMyClaims(data || []);
  };

  useEffect(() => {
    fetchMyClaims();
  }, [staff?.id]);

  const handleSubmit = async () => {
    const rawAmount = unformatNumber(amount);
    if (!rawAmount || !description || !date || approvalLine.length === 0) {
      alert('금액, 설명, 날짜, 결재 라인을 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    let receiptUrl = null;
    if (receiptFile) {
      const filePath = `receipts/${staff.id}/${Date.now()}_${receiptFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(filePath, receiptFile);
      if (uploadError) {
        console.error('Receipt upload error', uploadError);
        alert('영수증 업로드에 실패했습니다.');
        setLoading(false);
        return;
      }
      const { data } = supabase.storage.from('hr-documents').getPublicUrl(filePath);
      receiptUrl = data?.publicUrl || null;
    }
    const { data: claimData, error } = await supabase.from('expense_claims').insert({
      staff_id: staff.id,
      amount: parseFloat(rawAmount),
      description,
      expense_date: date,
      receipt_url: receiptUrl,
      status: 'Pending',
      date_submitted: new Date().toISOString(),
    }).select();

    if (error || !claimData) {
      console.error(error);
      alert('신청 중 오류가 발생했습니다.');
    } else {
      // Insert approval steps
      const steps = approvalLine.map((approverId, index) => ({
        request_id: claimData[0].id,
        request_type: 'expense',
        approver_id: approverId,
        step_order: index + 1,
        status: 'Pending'
      }));

      const { error: stepError } = await supabase.from('approval_steps').insert(steps);
      
      if (stepError) {
        console.error('Step insert error', stepError);
      }

      setSuccess(true);
      setAmount('');
      setDescription('');
      setDate('');
      setReceiptFile(null);
      setApprovalLine([]);
      fetchMyClaims();
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade">
      <header style={{ marginBottom: '32px' }}>
        <h2>경비 신청</h2>
        <p style={{ color: 'var(--text-muted)' }}>개인 경비 지출 내역을 입력하고 증빙(영수증)을 첨부하여 승인을 요청하세요.</p>
      </header>

      <div className="glass" style={{ padding: '24px', marginBottom: '32px', position: 'relative' }}>
        {success && (
          <div className="animate-fade-in" style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--success)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '600',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10
          }}>
            ✅ 신청이 성공적으로 완료되었습니다!
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ marginBottom: '20px', flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>금액 (원)</label>
            <input 
              className="input-field" 
              type="text" 
              placeholder="0" 
              value={amount} 
              onChange={e => setAmount(formatNumber(e.target.value))} 
            />
          </div>
          <div style={{ marginBottom: '20px', flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>지출 날짜</label>
            <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ marginBottom: '20px', width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>항목 및 설명</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="경비 지출 목적 및 내용" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
          <div style={{ marginBottom: '20px', width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>증빙 첨부 (이미지/PDF)</label>
            <input type="file" className="input-field" accept="image/*,application/pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        <ApprovalLinePicker onLineChange={setApprovalLine} />

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%', height: '48px', justifyContent: 'center' }}>
          <Send size={18} />
          {loading ? '신청 중...' : '신청하기'}
        </button>
      </div>

      <h3>나의 신청 내역</h3>
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {myClaims.map(c => (
          <div key={c.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: '600' }}>{c.description}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {c.expense_date} | {c.amount.toLocaleString()}원
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="glass-pill" style={{
                color: c.status === 'Approved' ? 'var(--success)' : c.status === 'Pending' ? 'var(--warning)' : 'var(--danger)'
              }}>
                {c.status === 'Approved' ? '승인완료' : c.status === 'Pending' ? '대기중' : '반려'}
              </span>
              {c.receipt_url && (
                <a href={c.receipt_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>영수증</a>
              )}
            </div>
          </div>
        ))}
        {myClaims.length === 0 && (
          <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            신청 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseRequest;
