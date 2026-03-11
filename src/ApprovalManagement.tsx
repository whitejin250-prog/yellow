import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { Check, X, Eye, Clock, CheckCircle, Send } from 'lucide-react';

const ApprovalManagement: React.FC = () => {
    const { staff } = useAuth();
    const [pendingItems, setPendingItems] = useState<any[]>([]);
    const [processedItems, setProcessedItems] = useState<any[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchStaff = async () => {
            const { data } = await supabase.from('staff').select('id, name');
            setStaffList(data || []);
        };
        fetchStaff();
    }, []);

    const fetchData = async () => {
        if (!staff?.id) return;
        setLoading(true);
        try {
            // 1. Fetch ALL steps for the current user (Simplify select)
            const { data: steps, error: stepsError } = await supabase
                .from('approval_steps')
                .select('*')
                .eq('approver_id', staff.id);
            
            if (stepsError) throw stepsError;

            // Group steps by request_id to fetch details later
            const expenseIds = steps?.filter(s => s.request_type === 'expense').map(s => s.request_id) || [];
            const certificateIds = steps?.filter(s => s.request_type === 'certificate').map(s => s.request_id) || [];

            // Fetch details in bulk
            const { data: expenses } = expenseIds.length > 0 
                ? await supabase.from('expense_claims').select('*, requester:staff_id(name)').in('id', expenseIds)
                : { data: [] };
            
            const { data: certificates } = certificateIds.length > 0
                ? await supabase.from('approval').select('*, requester:requester_id(name)').in('id', certificateIds)
                : { data: [] };

            // Map data for easy lookup
            const expenseMap = Object.fromEntries((expenses || []).map(e => [e.id, e]));
            const certificateMap = Object.fromEntries((certificates || []).map(c => [c.id, c]));

            const pending: any[] = [];
            const processed: any[] = [];

            for (const step of (steps || [])) {
                const doc = step.request_type === 'expense' ? expenseMap[step.request_id] : certificateMap[step.request_id];
                if (!doc) continue;

                const enrichedStep = { ...step, doc };

                if (step.status === 'Pending') {
                    // Check turn logic
                    const { data: prevSteps } = await supabase
                        .from('approval_steps')
                        .select('status')
                        .eq('request_id', step.request_id)
                        .lt('step_order', step.step_order);
                    
                    if ((prevSteps || []).every(ps => ps.status === 'Approved')) {
                        pending.push(enrichedStep);
                    }
                } else {
                    processed.push(enrichedStep);
                }
            }
            setPendingItems(pending);
            setProcessedItems(processed.sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()));

            // 2. Fetch My Requests (User's own submissions)
            const { data: myExpenses } = await supabase.from('expense_claims').select('*, approval_steps(*)').eq('staff_id', staff.id);
            const { data: myCertificates } = await supabase.from('approval').select('*, approval_steps(*)').eq('requester_id', staff.id);
            
            const unifiedRequests = [
                ...(myExpenses || []).map(e => ({ ...e, type: 'expense' })),
                ...(myCertificates || []).map(c => ({ ...c, type: 'certificate' }))
            ].sort((a, b) => new Date(b.created_at || b.request_date || b.date_submitted).getTime() - new Date(a.created_at || a.request_date || a.date_submitted).getTime());
            
            setMyRequests(unifiedRequests);

        } catch (err) {
            console.error('Fetch data error:', err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchData();
    }, [staff?.id]);

    const handleAction = async (requestId: string, requestType: 'expense' | 'certificate', status: 'Approved' | 'Rejected', stepId: string) => {
        setActionLoading(true);
        try {
            const { error: stepUpdateError } = await supabase
                .from('approval_steps')
                .update({ status, processed_at: new Date().toISOString() })
                .eq('id', stepId);
            
            if (stepUpdateError) throw stepUpdateError;

            if (status === 'Rejected') {
                const table = requestType === 'expense' ? 'expense_claims' : 'approval';
                await supabase.from(table).update({ status: 'Rejected' }).eq('id', requestId);
            } else {
                const { data: remaining } = await supabase
                    .from('approval_steps')
                    .select('id')
                    .eq('request_id', requestId)
                    .eq('status', 'Pending');
                
                if (!remaining || remaining.length === 0) {
                    const table = requestType === 'expense' ? 'expense_claims' : 'approval';
                    const updateData: any = { status: 'Approved' };
                    if (requestType === 'expense') {
                        updateData.approved_by = staff?.id;
                        updateData.approved_at = new Date().toISOString();
                    }
                    await supabase.from(table).update(updateData).eq('id', requestId);
                }
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert('오류 발생: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const openDetails = (step: any) => {
        // Re-fetch full steps to be sure
        supabase.from('approval_steps')
            .select('*')
            .eq('request_id', step.request_id)
            .order('step_order')
            .then(({ data }) => {
                setSelectedItem({ ...step, full_steps: data || [] });
                setIsModalOpen(true);
            });
    };

    const renderStatus = (status: string) => (
        <span className="glass-pill" style={{
            color: status === 'Approved' ? 'var(--success)' : status === 'Pending' ? 'var(--warning)' : 'var(--danger)',
            fontSize: '0.8rem'
        }}>
            {status === 'Approved' ? '승인됨' : status === 'Pending' ? '대기중' : '반려됨'}
        </span>
    );

    if (loading) return <div style={{ padding: '24px', color: 'var(--text-muted)' }}>로딩 중...</div>;

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>결재문서관리</h2>
                <p style={{ color: 'var(--text-muted)' }}>결재 대기 문서 확인, 처리 이력 및 본인의 신청 내역을 통합 관리합니다.</p>
            </header>

            {/* 1. 결재 대기중인 문서 */}
            <section style={{ marginBottom: '48px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Clock size={20} color="var(--warning)" />
                    결재 대기중인 문서
                    <span className="badge" style={{ background: 'var(--warning)', color: 'white' }}>{pendingItems.length}</span>
                </h3>
                <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--primary)', color: 'white', textAlign: 'left' }}>
                                <th style={{ padding: '16px' }}>구분</th>
                                <th style={{ padding: '16px' }}>신청자</th>
                                <th style={{ padding: '16px' }}>제목/내용</th>
                                <th style={{ padding: '16px' }}>신청일</th>
                                <th style={{ padding: '16px' }}>작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingItems.map(step => (
                                <tr key={step.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                            {step.request_type === 'expense' ? '경비' : '증명서'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '500' }}>{step.doc?.requester?.name || 'Unknown'}</td>
                                    <td style={{ padding: '16px' }}>{step.doc?.description || step.doc?.doc_type}</td>
                                    <td style={{ padding: '16px', fontSize: '0.85rem' }}>{new Date(step.doc?.created_at || step.doc?.request_date || step.doc?.date_submitted).toLocaleDateString()}</td>
                                    <td style={{ padding: '16px' }}>
                                        <button onClick={() => openDetails(step)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                            <Eye size={14} style={{ marginRight: '4px' }} />
                                            검토/승인
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pendingItems.length === 0 && (
                                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>대기 중인 문서가 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* 2. 내가 올린 결재문서 */}
            <section style={{ marginBottom: '48px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Send size={20} color="var(--primary)" />
                    내가 올린 결재문서
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {myRequests.slice(0, 6).map(req => (
                        <div key={req.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    {req.type === 'expense' ? '경비' : '증명서'} | {new Date(req.created_at || req.request_date || req.date_submitted).toLocaleDateString()}
                                </p>
                                <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{req.description || req.doc_type}</p>
                                {req.amount && <p style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{req.amount.toLocaleString()}원</p>}
                            </div>
                            {renderStatus(req.status)}
                        </div>
                    ))}
                    {myRequests.length === 0 && (
                        <div className="glass" style={{ padding: '24px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>신청 내역이 없습니다.</div>
                    )}
                </div>
            </section>

            {/* 3. 결재 완료된 문서 */}
            <section style={{ marginBottom: '48px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <CheckCircle size={20} color="var(--success)" />
                    결재 완료된 문서 (이력)
                </h3>
                <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', fontSize: '0.9rem' }}>
                                <th style={{ padding: '16px' }}>구분</th>
                                <th style={{ padding: '16px' }}>신청자</th>
                                <th style={{ padding: '16px' }}>제목/내용</th>
                                <th style={{ padding: '16px' }}>처리결과</th>
                                <th style={{ padding: '16px' }}>처리일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedItems.slice(0, 10).map(step => (
                                <tr key={step.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                    <td style={{ padding: '12px 16px' }}>{step.request_type === 'expense' ? '경비' : '증명서'}</td>
                                    <td style={{ padding: '12px 16px' }}>{step.doc?.requester?.name || 'Unknown'}</td>
                                    <td style={{ padding: '12px 16px' }}>{step.doc?.description || step.doc?.doc_type}</td>
                                    <td style={{ padding: '12px 16px' }}>{renderStatus(step.status)}</td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(step.processed_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Modal for detail view */}
            {isModalOpen && selectedItem && (
                <div className="modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3>문서 검토</h3>
                            <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        
                        <div className="glass" style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>기본 정보</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><p style={{ fontSize: '0.8rem' }}>신청자: <strong>{selectedItem.doc.requester?.name}</strong></p></div>
                                <div><p style={{ fontSize: '0.8rem' }}>구분: <strong>{selectedItem.request_type === 'expense' ? '경비 신청' : '증명서 신청'}</strong></p></div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <p style={{ fontSize: '0.8rem' }}>내용: <strong>{selectedItem.doc.description || selectedItem.doc.doc_type}</strong></p>
                                </div>
                                {selectedItem.doc.amount && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <p style={{ fontSize: '0.8rem' }}>금액: <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{selectedItem.doc.amount.toLocaleString()}원</strong></p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedItem.doc.receipt_url && (
                             <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>증빙자료</p>
                                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                    <img src={selectedItem.doc.receipt_url} alt="Receipt" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                                    <a href={selectedItem.doc.receipt_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ position: 'absolute', bottom: '8px', right: '8px', padding: '4px 8px', fontSize: '0.7rem' }}>새창에서 보기</a>
                                </div>
                             </div>
                        )}

                        <div style={{ marginBottom: '32px' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>결재 라인</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedItem.full_steps.map((s: any) => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', background: s.approver_id === staff?.id ? 'rgba(49, 64, 255, 0.1)' : 'rgba(255,255,255,0.02)', border: s.approver_id === staff?.id ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: s.status === 'Approved' ? 'var(--success)' : s.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>{s.step_order}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '600' }}>{staffList.find(st => st.id === s.approver_id)?.name}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.status === 'Approved' ? '승인완료' : s.status === 'Rejected' ? '반려' : '대기중'}</p>
                                        </div>
                                        {s.processed_at && <span style={{ fontSize: '0.7rem' }}>{new Date(s.processed_at).toLocaleDateString()}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedItem.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => handleAction(selectedItem.doc.id, selectedItem.request_type, 'Approved', selectedItem.id)}
                                    disabled={actionLoading}
                                    className="btn btn-primary"
                                    style={{ flex: 1, justifyContent: 'center', background: 'var(--success)' }}
                                >
                                    <Check size={20} />
                                    최종 승인
                                </button>
                                <button
                                    onClick={() => handleAction(selectedItem.doc.id, selectedItem.request_type, 'Rejected', selectedItem.id)}
                                    disabled={actionLoading}
                                    className="btn btn-secondary"
                                    style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)' }}
                                >
                                    <X size={20} />
                                    반려
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalManagement;
