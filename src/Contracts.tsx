import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { ShieldCheck, Calendar, Globe, PenTool } from 'lucide-react';

const Contracts: React.FC = () => {
    const { staff } = useAuth();
    const [contracts, setContracts] = useState<any[]>([]);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        const { data } = await supabase
            .from('approval')
            .select('*, signature(*)')
            .eq('requester_id', staff.id)
            .eq('doc_type', 'Contract')
            .order('request_date', { ascending: false });
        setContracts(data || []);
    };

    const handleSign = async (docId: string) => {
        // Get IP Address simulated (in real app, use a service or server side)
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();

        const { error } = await supabase
            .from('signature')
            .upsert({
                doc_id: docId,
                signed_at: new Date().toISOString(),
                ip_address: ip,
                is_completed: true
            });

        if (!error) {
            alert('서명이 완료되었습니다. IP와 타임스탬프가 보안 로그에 기록되었습니다.');
            fetchContracts();
        }
    };

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>내 근로계약서 확인</h2>
                <p style={{ color: 'var(--text-muted)' }}>회사가 발송한 근로계약서를 검토하고 온라인 서명을 진행합니다.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {contracts.map(contract => (
                    <div key={contract.id} className="glass" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>표준 근로계약서</h4>
                                <p style={{ color: 'var(--text-muted)' }}>발송일: {new Date(contract.request_date).toLocaleDateString()}</p>
                            </div>
                            <span className="glass-pill" style={{
                                color: contract.signature?.is_completed ? 'var(--success)' : 'var(--warning)'
                            }}>
                                {contract.signature?.is_completed ? '서명완료' : '서명대기'}
                            </span>
                        </div>

                        {contract.signature?.is_completed ? (
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} color="var(--primary)" />
                                        <span>서명일시: {new Date(contract.signature.signed_at).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Globe size={14} color="var(--primary)" />
                                        <span>IP주소: {contract.signature.ip_address}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button className="btn btn-primary" onClick={() => handleSign(contract.id)}>
                                <PenTool size={18} />
                                전자서명 하기
                            </button>
                        )}
                    </div>
                ))}

                {contracts.length === 0 && (
                    <div className="glass" style={{ padding: '40px', textAlign: 'center' }}>
                        <ShieldCheck size={48} color="var(--glass-border)" style={{ marginBottom: '16px' }} />
                        <p style={{ color: 'var(--text-muted)' }}>발송된 계약서가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Contracts;
