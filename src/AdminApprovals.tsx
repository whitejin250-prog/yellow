import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Check, X, FileText, User } from 'lucide-react';

const AdminApprovals: React.FC = () => {
    const [approvals, setApprovals] = useState<any[]>([]);

    useEffect(() => {
        fetchApprovals();
    }, []);

    const fetchApprovals = async () => {
        const { data } = await supabase
            .from('approval')
            .select('*, staff:requester_id(name, employee_no)')
            .eq('status', 'Pending')
            .order('request_date', { ascending: true });
        setApprovals(data || []);
    };

    const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
        const { error } = await supabase
            .from('approval')
            .update({ status, approver_id: (await supabase.auth.getUser()).data.user?.id })
            .eq('id', id);

        if (!error) {
            alert(`문서가 ${status === 'Approved' ? '승인' : '반려'}되었습니다.`);
            fetchApprovals();
        }
    };

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>결재 승인 대기 목록</h2>
                <p style={{ color: 'var(--text-muted)' }}>직원들이 신청한 증명서 발급 요청을 검토하고 승인합니다.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {approvals.map(app => (
                    <div key={app.id} className="glass" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <FileText color="var(--primary)" size={32} />
                                </div>
                                <div>
                                    <h4 style={{ fontWeight: '700' }}>{app.doc_type}</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{app.staff?.name} ({app.staff?.employee_no})</p>
                                </div>
                            </div>
                            <span className="glass-pill" style={{ color: 'var(--warning)' }}>대기중</span>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                신청일: {new Date(app.request_date).toLocaleString()}
                            </p>
                            {app.purpose && (
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                                    <strong>용도:</strong> {app.purpose}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => handleAction(app.id, 'Approved')}
                            >
                                <Check size={18} />
                                승인
                            </button>
                            <button
                                className="btn"
                                style={{ flex: 1, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
                                onClick={() => handleAction(app.id, 'Rejected')}
                            >
                                <X size={18} />
                                반려
                            </button>
                        </div>
                    </div>
                ))}

                {approvals.length === 0 && (
                    <div className="glass" style={{ padding: '40px', gridColumn: '1 / -1', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)' }}>대기 중인 결재 문서가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminApprovals;
