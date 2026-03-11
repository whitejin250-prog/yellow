import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { ArrowLeft, UserCircle, AlertCircle, PlusCircle } from 'lucide-react';

interface OrgUnit {
    id: string;
    name: string;
    type: 'Headquarters' | 'Office' | 'Team';
    parent_id: string | null;
}

const AdminStaffAdd: React.FC = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
    const [staff, setStaff] = useState<any>({
        name: '',
        employee_no: '',
        phone: '',
        position: '',
        headquarters: '',
        department_office: '',
        team: '',
        email: '',
        password: '', // New field for admin to set
        role_level: 'User',
        birthdate: '',
        address: '',
        status: 'Active', // Default to Active for admin-created accounts
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: '',
        join_date: '',
        resignation_date: ''
    });

    useEffect(() => {
        fetchOrgUnits();
    }, []);

    const fetchOrgUnits = async () => {
        const { data } = await supabase.from('organization_units').select('*').order('name', { ascending: true });
        if (data) setOrgUnits(data);
    };

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phone = value.replace(/[^\d]/g, '');
        if (phone.length < 4) return phone;
        if (phone.length < 7) return `${phone.slice(0, 3)}-${phone.slice(3)}`;
        if (phone.length < 11) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
        return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7, 11)}`;
    };

    const handleSave = async () => {
        if (!staff.name || !staff.employee_no || !staff.email || !staff.password) {
            return alert('이름, 사번, 이메일, 비밀번호는 필수 입력 사항입니다.');
        }

        setSaving(true);
        try {
            const { error } = await supabase.functions.invoke('admin-create-staff', {
                body: {
                    email: staff.email,
                    password: staff.password,
                    staff_details: {
                        name: staff.name,
                        employee_no: staff.employee_no,
                        headquarters: staff.headquarters,
                        department_office: staff.department_office,
                        team: staff.team,
                        position: staff.position,
                        phone: staff.phone,
                        role_level: staff.role_level,
                        birthdate: staff.birthdate || null,
                        address: staff.address || null,
                        status: staff.status,
                        join_date: staff.join_date || null,
                        resignation_date: staff.resignation_date || null
                    },
                    emergency_contact: {
                        contact_name: staff.emergency_name,
                        relationship: staff.emergency_relationship,
                        phone: staff.emergency_phone
                    }
                }
            });

            if (error) throw error;

            alert('새로운 직원과 계정이 성공적으로 등록되었습니다.');
            navigate('/admin/staff');
        } catch (error: any) {
            alert('등록 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter units based on selection
    const availableHeadquarters = orgUnits.filter(u => u.type === 'Headquarters');
    const selectedHqId = orgUnits.find(u => u.name === staff.headquarters && u.type === 'Headquarters')?.id;
    const availableOffices = selectedHqId ? orgUnits.filter(u => u.type === 'Office' && u.parent_id === selectedHqId) : [];
    const selectedOfficeId = orgUnits.find(u => u.name === staff.department_office && u.type === 'Office' && u.parent_id === selectedHqId)?.id;
    const availableTeams = selectedOfficeId
        ? orgUnits.filter(u => u.type === 'Team' && u.parent_id === selectedOfficeId)
        : selectedHqId
            ? orgUnits.filter(u => u.type === 'Team' && u.parent_id === selectedHqId)
            : [];
    return (
        <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/admin/staff')}
                    className="btn"
                    style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                >
                    <ArrowLeft size={20} color="var(--text-muted)" />
                </button>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>신규 직원 등록</h2>
                    <p style={{ color: 'var(--text-muted)' }}>관리자가 직원의 로그인 계정과 인사 정보를 함께 생성합니다.</p>
                </div>
            </header>

            <div className="glass" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* Basic Info Section */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCircle size={20} />
                        계정 및 기본 인적 사항
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>이름 <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input
                                className="input-field"
                                placeholder="성함을 입력하세요"
                                value={staff.name}
                                onChange={e => setStaff({ ...staff, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>사번 <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input
                                className="input-field"
                                placeholder="예: 2024001"
                                value={staff.employee_no}
                                onChange={e => setStaff({ ...staff, employee_no: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>연락처</label>
                            <input
                                className="input-field"
                                placeholder="010-0000-0000"
                                value={staff.phone}
                                onChange={e => setStaff({ ...staff, phone: formatPhoneNumber(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>이메일 계정 (로그인 ID) <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input
                                className="input-field"
                                placeholder="example@company.com"
                                value={staff.email}
                                onChange={e => setStaff({ ...staff, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>초기 비밀번호 <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="최소 6자 이상"
                                value={staff.password}
                                onChange={e => setStaff({ ...staff, password: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>직급 / 직책</label>
                            <input
                                className="input-field"
                                placeholder="예: 매니저"
                                value={staff.position}
                                onChange={e => setStaff({ ...staff, position: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>본부</label>
                            <select
                                className="input-field"
                                value={staff.headquarters}
                                onChange={e => setStaff({ ...staff, headquarters: e.target.value, department_office: '', team: '' })}
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                            >
                                <option value="">본부 선택</option>
                                {availableHeadquarters.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>실</label>
                            <select
                                className="input-field"
                                value={staff.department_office}
                                onChange={e => setStaff({ ...staff, department_office: e.target.value, team: '' })}
                                disabled={!staff.headquarters}
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                            >
                                <option value="">실 선택</option>
                                {availableOffices.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>팀</label>
                            <select
                                className="input-field"
                                value={staff.team}
                                onChange={e => setStaff({ ...staff, team: e.target.value })}
                                disabled={!staff.headquarters}
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                            >
                                <option value="">팀 선택</option>
                                {availableTeams.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>생년월일</label>
                            <input
                                type="date"
                                className="input-field"
                                value={staff.birthdate}
                                onChange={e => setStaff({ ...staff, birthdate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>접근 권한 설정</label>
                            <select
                                className="input-field"
                                value={staff.role_level}
                                onChange={e => setStaff({ ...staff, role_level: e.target.value })}
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                            >
                                <option value="User">일반 사용자 (User)</option>
                                <option value="Admin">관리자 (Admin)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>입사일</label>
                            <input
                                type="date"
                                className="input-field"
                                value={staff.join_date}
                                onChange={e => setStaff({ ...staff, join_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>퇴사일</label>
                            <input
                                type="date"
                                className="input-field"
                                value={staff.resignation_date}
                                onChange={e => setStaff({ ...staff, resignation_date: e.target.value })}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>거주지 주소</label>
                            <input
                                className="input-field"
                                placeholder="상세 주소를 입력하세요"
                                value={staff.address}
                                onChange={e => setStaff({ ...staff, address: e.target.value })}
                            />
                        </div>
                    </div>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

                {/* Emergency Contact Section */}
                <section>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={20} />
                        비상 연락망 설정 (선택사항)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>관계</label>
                            <input
                                className="input-field"
                                placeholder="예: 부, 모, 배우자"
                                value={staff.emergency_relationship}
                                onChange={e => setStaff({ ...staff, emergency_relationship: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>성함</label>
                            <input
                                className="input-field"
                                placeholder="비상연락망 성함"
                                value={staff.emergency_name}
                                onChange={e => setStaff({ ...staff, emergency_name: e.target.value })}
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>비상연락처 전화번호</label>
                            <input
                                className="input-field"
                                placeholder="010-0000-0000"
                                value={staff.emergency_phone}
                                onChange={e => setStaff({ ...staff, emergency_phone: formatPhoneNumber(e.target.value) })}
                            />
                        </div>
                    </div>
                </section>

                <footer style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/admin/staff')}
                        className="btn"
                        style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn btn-primary"
                        style={{ flex: 2, justifyContent: 'center' }}
                    >
                        {saving ? <div className="spinner-small" /> : <PlusCircle size={20} />}
                        {saving ? '등록 처리 중...' : '새로운 직원 등록하기'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AdminStaffAdd;
