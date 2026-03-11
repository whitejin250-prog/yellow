import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { UserPlus, Shield, Edit2, Trash2 } from 'lucide-react';

const AdminStaff: React.FC = () => {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState<any[]>([]);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        const { data } = await supabase
            .from('staff')
            .select('*')
            .order('created_at', { ascending: false });
        setStaffList(data || []);
    };

    const handleStatusChange = async (id: string, status: string, oldData: any) => {
        const { error } = await supabase.from('staff').update({ status }).eq('id', id);

        if (!error) {
            await supabase.from('audit_log').insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                action: 'STATUS_CHANGE',
                table_name: 'staff',
                record_id: id,
                old_data: { status: oldData.status },
                new_data: { status: status },
                ip_address: 'System'
            });
            fetchStaff();
        }
    };

    const handleDeleteStaff = async (staff: any) => {
        if (!window.confirm(`'${staff.name}' 직원을 정말로 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) return;

        try {
            // Check if there are related records in approval table (prevent orphan records if necessary)
            // For now, let's just delete the staff record. If there are FK constraints, it might fail.
            const { error } = await supabase
                .from('staff')
                .delete()
                .eq('id', staff.id);

            if (error) throw error;

            await supabase.from('audit_log').insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                action: 'STAFF_DELETE',
                table_name: 'staff',
                record_id: staff.id,
                old_data: staff,
                new_data: null,
                ip_address: 'System'
            });

            alert('직원 정보가 삭제되었습니다.');
            fetchStaff();
        } catch (error: any) {
            alert('삭제 중 오류가 발생했습니다: ' + error.message);
        }
    };

    return (
        <div className="animate-fade">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h2>전체 직원 관리</h2>
                    <p style={{ color: 'var(--text-muted)' }}>우리 기업의 모든 직원 정보를 관리하고 가입을 승인합니다.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/admin/staff/add')}>
                    <UserPlus size={18} />
                    직원 등록
                </button>
            </header>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px 24px' }}>이름 / 사번</th>
                            <th style={{ padding: '16px 24px' }}>부서 / 직급</th>
                            <th style={{ padding: '16px 24px' }}>상태</th>
                            <th style={{ padding: '16px 24px' }}>권한</th>
                            <th style={{ padding: '16px 24px' }}>수정</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staffList.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: '600' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.employee_no}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontSize: '0.9rem' }}>
                                        {[item.headquarters, item.department_office, item.team].filter(Boolean).join(' > ') || '-'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.position || '-'}</div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span className="glass-pill" style={{
                                        color: item.status === 'Active' ? 'var(--success)' : item.status === 'Pending' ? 'var(--warning)' : 'var(--text-muted)'
                                    }}>
                                        {item.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Shield size={14} color={item.role_level === 'Admin' ? 'var(--primary)' : 'var(--text-muted)'} />
                                        {item.role_level}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {item.status === 'Pending' && (
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                                onClick={() => handleStatusChange(item.id, 'Active', item)}
                                            >
                                                승인
                                            </button>
                                        )}
                                        <button
                                            className="btn"
                                            style={{ padding: '4px' }}
                                            onClick={() => navigate(`/admin/staff/edit/${item.id}`)}
                                        >
                                            <Edit2 size={18} color="var(--primary)" />
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ padding: '4px' }}
                                            onClick={() => handleDeleteStaff(item)}
                                        >
                                            <Trash2 size={18} color="var(--danger)" style={{ opacity: 0.7 }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminStaff;
