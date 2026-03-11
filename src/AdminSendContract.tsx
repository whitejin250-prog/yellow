import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Send } from 'lucide-react';

const AdminSendContract: React.FC = () => {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [templateList, setTemplateList] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStaff();
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('document_templates')
            .select('id, name')
            .eq('category', 'Contract');
        setTemplateList(data || []);
        if (data && data.length > 0) setSelectedTemplate(data[0].id);
    };

    const fetchStaff = async () => {
        const { data } = await supabase
            .from('staff')
            .select('id, name, employee_no')
            .eq('status', 'Active');
        setStaffList(data || []);
    };

    const handleSend = async () => {
        if (!selectedStaff) return alert('직원을 선택해 주세요.');
        if (!selectedTemplate) return alert('계약서 양식을 선택해 주세요.');

        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();

        const selectedTemplateObj = templateList.find(t => t.id === selectedTemplate);

        const { error } = await supabase.from('approval').insert({
            requester_id: selectedStaff,
            doc_type: 'Contract',
            status: 'Pending',
            approver_id: userData.user?.id,
            pdf_path: selectedTemplateObj?.name
        });

        if (!error) {
            alert('근로계약서 발송이 완료되었습니다.');
            setSelectedStaff('');
        } else {
            alert('발송 중 오류가 발생했습니다: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>계약서 발송</h2>
                <p style={{ color: 'var(--text-muted)' }}>신규 또는 갱신된 근로계약서를 직원에게 전송합니다.</p>
            </header>

            <div className="glass" style={{ padding: '32px', maxWidth: '600px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>대상 직원 선택</label>
                    <select
                        className="input-field"
                        value={selectedStaff}
                        onChange={e => setSelectedStaff(e.target.value)}
                    >
                        <option value="">직원을 선택하세요...</option>
                        {staffList.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.employee_no})</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>계약서 양식 선택</label>
                    <select
                        className="input-field"
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                    >
                        {templateList.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        {templateList.length === 0 && <option value="">등록된 계약 양식이 없습니다.</option>}
                    </select>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px' }}>발송 미리보기</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>발송 시 직원의 '내 근로계약서' 메뉴에 선택된 양식이 즉시 노출됩니다.</p>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSend} disabled={loading}>
                    <Send size={18} />
                    {loading ? '발송 중...' : '계약서 발송하기'}
                </button>
            </div>
        </div>
    );
};

export default AdminSendContract;
