import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Users, ChevronRight, ChevronDown, Building2, LayoutGrid, Users2, Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { useAuth } from './AuthContext';

interface OrgUnit {
    id: string;
    name: string;
    type: 'Headquarters' | 'Office' | 'Team';
    parent_id: string | null;
}

interface Staff {
    id: string;
    name: string;
    employee_no: string;
    headquarters: string;
    department_office: string;
    team: string;
    position: string;
    phone: string;
    email: string;
    status: string;
}

const OrgChart: React.FC = () => {
    const { isAdminMode } = useAuth();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    // Organization Management State
    const [manageModal, setManageModal] = useState<{
        show: boolean;
        type: 'Headquarters' | 'Office' | 'Team';
        action: 'add' | 'edit';
        parentId?: string;
        unitId?: string;
        name: string;
    }>({ show: false, type: 'Headquarters', action: 'add', name: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffRes, orgRes] = await Promise.all([
                supabase.from('staff').select('*').eq('status', 'Active').order('name', { ascending: true }),
                supabase.from('organization_units').select('*').order('name', { ascending: true })
            ]);

            setStaffList(staffRes.data || []);
            setOrgUnits(orgRes.data || []);

            // Auto-expand all levels by default on initial load
            const initialExpanded: Record<string, boolean> = { 'motive': true };
            orgRes.data?.forEach((u: OrgUnit) => {
                initialExpanded[u.id] = true;
            });
            setExpandedUnits(initialExpanded);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle dragging for staff profile
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setModalPos({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleStaffClick = (staff: Staff) => {
        setSelectedStaff(staff);
        setModalPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    const startDragging = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - modalPos.x,
            y: e.clientY - modalPos.y
        });
    };

    const toggleExpand = (id: string) => {
        setExpandedUnits(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Org Unit Management Actions
    const handleAddUnit = (type: 'Headquarters' | 'Office' | 'Team', parentId?: string) => {
        setManageModal({ show: true, type, action: 'add', name: '', parentId });
    };

    const handleEditUnit = (unit: OrgUnit) => {
        setManageModal({ show: true, type: unit.type, action: 'edit', name: unit.name, unitId: unit.id, parentId: unit.parent_id || undefined });
    };

    const handleDeleteUnit = async (unit: OrgUnit) => {
        if (!window.confirm(`'${unit.name}' 조직을 정말로 삭제하시겠습니까? 하위 조직과 소속 정보가 초기화될 수 있습니다.`)) return;

        const { error } = await supabase.from('organization_units').delete().eq('id', unit.id);
        if (error) {
            alert("삭제 중 오류가 발생했습니다: " + error.message);
        } else {
            fetchData();
        }
    };

    const saveOrgUnit = async () => {
        if (!manageModal.name.trim()) return alert("조직명을 입력해주세요.");

        if (manageModal.action === 'add') {
            const { error } = await supabase.from('organization_units').insert({
                name: manageModal.name,
                type: manageModal.type,
                parent_id: manageModal.parentId || null
            });
            if (error) alert(error.message);
        } else {
            const { error } = await supabase.from('organization_units').update({
                name: manageModal.name
            }).eq('id', manageModal.unitId);
            if (error) alert(error.message);
        }

        setManageModal({ ...manageModal, show: false });
        fetchData();
    };

    // Building Hierarchy
    const renderHierarchy = () => {
        const headquarters = orgUnits.filter(u => u.type === 'Headquarters');

        return (
            <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                <div
                    onClick={() => toggleExpand('motive')}
                    style={{
                        padding: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        borderBottom: expandedUnits['motive'] ? '1px solid var(--glass-border)' : 'none'
                    }}
                >
                    {expandedUnits['motive'] ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                    <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px', color: 'white' }}>
                        <Building2 size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>모티브인텔리전스</h3>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            총 {staffList.length}명
                        </span>
                        {isAdminMode && (
                            <button
                                className="btn-icon"
                                style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '6px' }}
                                onClick={(e) => { e.stopPropagation(); handleAddUnit('Headquarters'); }}
                                title="본부 추가"
                            >
                                <Plus size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {expandedUnits['motive'] && (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {headquarters.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>등록된 본부가 없습니다.</p>}
                        {headquarters.map(hq => {
                            const offices = orgUnits.filter(u => u.type === 'Office' && u.parent_id === hq.id);
                            return (
                                <div key={hq.id} style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--glass-border)',
                                    overflow: 'hidden'
                                }}>
                                    <div
                                        onClick={() => toggleExpand(hq.id)}
                                        style={{
                                            padding: '16px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderBottom: expandedUnits[hq.id] ? '1px solid var(--glass-border)' : 'none'
                                        }}
                                    >
                                        {expandedUnits[hq.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        <div style={{ color: 'var(--primary)' }}>
                                            <LayoutGrid size={18} />
                                        </div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{hq.name}</h4>
                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isAdminMode && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn-icon" title="본부 수정" onClick={(e) => { e.stopPropagation(); handleEditUnit(hq); }}><Edit size={14} /></button>
                                                    <button className="btn-icon" title="본부 삭제" onClick={(e) => { e.stopPropagation(); handleDeleteUnit(hq); }}><Trash2 size={14} color="var(--danger)" /></button>
                                                    <button className="btn-icon" title="실 추가" style={{ background: 'var(--secondary)', color: 'white' }} onClick={(e) => { e.stopPropagation(); handleAddUnit('Office', hq.id); }}><Plus size={14} /></button>
                                                    <button className="btn-icon" title="직속 팀 추가" style={{ background: 'var(--primary)', color: 'white' }} onClick={(e) => { e.stopPropagation(); handleAddUnit('Team', hq.id); }}><Users size={14} /></button>
                                                </div>
                                            )}
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {staffList.filter(s => s.headquarters === hq.name).length}명
                                            </span>
                                        </div>
                                    </div>

                                    {expandedUnits[hq.id] && (
                                        <div style={{ padding: '16px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {/* Render Offices */}
                                            {offices.map(office => {
                                                const teams = orgUnits.filter(u => u.type === 'Team' && u.parent_id === office.id);
                                                return (
                                                    <div key={office.id} style={{ borderLeft: '2px solid var(--glass-border)', paddingLeft: '20px', marginLeft: '8px' }}>
                                                        <div
                                                            onClick={() => toggleExpand(office.id)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}
                                                        >
                                                            <h5 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--secondary)' }}>{office.name}</h5>
                                                            {expandedUnits[office.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            {isAdminMode && (
                                                                <div style={{ display: 'flex', gap: '4px', opacity: 0.7 }}>
                                                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditUnit(office); }}><Edit size={12} /></button>
                                                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteUnit(office); }}><Trash2 size={12} color="var(--danger)" /></button>
                                                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleAddUnit('Team', office.id); }}><Plus size={12} color="var(--primary)" /></button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {expandedUnits[office.id] && (
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                                                {teams.map(team => {
                                                                    const members = staffList.filter(s => s.headquarters === hq.name && s.department_office === office.name && s.team === team.name);
                                                                    return (
                                                                        <div key={team.id} className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                                                                                <Users size={14} color="var(--text-muted)" />
                                                                                <h6 style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>{team.name}</h6>
                                                                                {isAdminMode && (
                                                                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                                                                                        <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); handleEditUnit(team); }}><Edit size={10} /></button>
                                                                                        <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); handleDeleteUnit(team); }}><Trash2 size={10} color="var(--danger)" /></button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                                {members.map((m: Staff) => (
                                                                                    <div
                                                                                        key={m.id}
                                                                                        onClick={() => handleStaffClick(m)}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '10px',
                                                                                            cursor: 'pointer',
                                                                                            padding: '6px',
                                                                                            borderRadius: '8px',
                                                                                            transition: 'background 0.2s'
                                                                                        }}
                                                                                        className="hover-bg"
                                                                                    >
                                                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: '600' }}>
                                                                                            {m.name.charAt(0)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{m.name}</p>
                                                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{m.position}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                                {members.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>소속 직원 없음</p>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {teams.length === 0 && <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>등록된 팀이 없습니다.</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Render Direct Teams (Skip Office) */}
                                            {orgUnits.filter(u => u.type === 'Team' && u.parent_id === hq.id).length > 0 && (
                                                <div style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '20px', marginLeft: '8px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                                        {orgUnits.filter(u => u.type === 'Team' && u.parent_id === hq.id).map(team => {
                                                            const members = staffList.filter(s => s.headquarters === hq.name && (s.department_office === '' || !s.department_office) && s.team === team.name);
                                                            return (
                                                                <div key={team.id} className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                                                                        <Users size={14} color="var(--text-muted)" />
                                                                        <h6 style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>{team.name}</h6>
                                                                        {isAdminMode && (
                                                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                                                                                <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); handleEditUnit(team); }}><Edit size={10} /></button>
                                                                                <button className="btn-icon" style={{ padding: '2px' }} onClick={(e) => { e.stopPropagation(); handleDeleteUnit(team); }}><Trash2 size={10} color="var(--danger)" /></button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                        {members.map((m: Staff) => (
                                                                            <div
                                                                                key={m.id}
                                                                                onClick={() => handleStaffClick(m)}
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '10px',
                                                                                    cursor: 'pointer',
                                                                                    padding: '6px',
                                                                                    borderRadius: '8px',
                                                                                    transition: 'background 0.2s'
                                                                                }}
                                                                                className="hover-bg"
                                                                            >
                                                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: '600' }}>
                                                                                    {m.name.charAt(0)}
                                                                                </div>
                                                                                <div>
                                                                                    <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{m.name}</p>
                                                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{m.position}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {members.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>소속 직원 없음</p>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {offices.length === 0 && orgUnits.filter(u => u.type === 'Team' && u.parent_id === hq.id).length === 0 && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>등록된 하위 조직이 없습니다.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderSearchResults = () => {
        const filteredStaff = staffList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filteredStaff.length === 0) {
            return (
                <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
                </div>
            );
        }

        return (
            <div className="glass" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px' }}>검색 결과 ({filteredStaff.length}명)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {filteredStaff.map((m: Staff) => (
                        <div
                            key={m.id}
                            onClick={() => handleStaffClick(m)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--glass-border)',
                                transition: 'all 0.2s',
                            }}
                            className="hover-card"
                        >
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem', fontWeight: '700' }}>
                                {m.name.charAt(0)}
                            </div>
                            <div>
                                <p style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0 0 4px 0' }}>{m.name}</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                    {[m.headquarters, m.department_office, m.team].filter(Boolean).join(' > ')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}><div className="spinner-small" style={{ margin: '0 auto 12px' }} />조직도를 불러오는 중...</div>;

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                        <Users2 size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>조직도</h2>
                        <p style={{ color: 'var(--text-muted)' }}>우리 기업의 조직 구성과 구성원을 한눈에 확인합니다.</p>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
                <input
                    type="text"
                    placeholder="직원 이름으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontSize: '1rem', width: '100%' }}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="btn-icon" style={{ marginLeft: 'auto' }}>
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="org-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {searchTerm ? renderSearchResults() : renderHierarchy()}
            </div>

            {/* Org Management Modal */}
            {manageModal.show && (
                <div className="modal-backdrop" onClick={() => setManageModal({ ...manageModal, show: false })}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                                {manageModal.action === 'add' ? '새 조직 추가' : '조직 정보 수정'}
                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginLeft: '8px' }}>
                                    ({manageModal.type === 'Headquarters' ? '본부' : manageModal.type === 'Office' ? '실' : '팀'})
                                </span>
                            </h3>
                            <button onClick={() => setManageModal({ ...manageModal, show: false })} className="btn-icon"><X size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>조직명</label>
                            <input
                                className="input-field"
                                value={manageModal.name}
                                onChange={e => setManageModal({ ...manageModal, name: e.target.value })}
                                placeholder="예: 경영지원본부, 인사실"
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn" style={{ flex: 1 }} onClick={() => setManageModal({ ...manageModal, show: false })}>취소</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveOrgUnit}>저장하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Profile Popup */}
            {selectedStaff && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 9999,
                    }}
                    onClick={() => setSelectedStaff(null)}
                >
                    <div
                        className="glass animate-fade-in"
                        style={{
                            width: 'calc(100% - 40px)',
                            maxWidth: '380px',
                            padding: '24px',
                            position: 'absolute',
                            top: `${modalPos.y}px`,
                            left: `${modalPos.x}px`,
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            cursor: isDragging ? 'grabbing' : 'auto',
                            userSelect: 'none'
                        }}
                        onClick={e => e.stopPropagation()}
                        onMouseDown={startDragging}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, height: '40px',
                            cursor: 'grab', zIndex: -1
                        }} />

                        <button
                            onClick={() => setSelectedStaff(null)}
                            style={{
                                position: 'absolute', top: '12px', right: '12px',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', zIndex: 1
                            }}
                        >
                            <ChevronRight size={20} style={{ transform: 'rotate(45deg)' }} />
                        </button>

                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'var(--primary)', margin: '0 auto 12px auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '1.5rem', fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)'
                        }}>
                            {selectedStaff.name.charAt(0)}
                        </div>

                        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '2px' }}>{selectedStaff.name}</h3>
                        <p style={{ color: 'var(--primary)', fontWeight: '600', marginBottom: '16px', fontSize: '0.9rem' }}>{selectedStaff.position}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>부서 정보</label>
                                <p style={{ fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>
                                    {[selectedStaff.headquarters, selectedStaff.department_office, selectedStaff.team].filter(Boolean).join(' > ')}
                                </p>
                            </div>
                            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>전화번호</label>
                                <p style={{ fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>{selectedStaff.phone || '-'}</p>
                            </div>
                            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>이메일</label>
                                <p style={{ fontSize: '0.9rem', fontWeight: '500', margin: 0, wordBreak: 'break-all' }}>{selectedStaff.email || '-'}</p>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '20px', padding: '10px', justifyContent: 'center' }}
                            onClick={() => setSelectedStaff(null)}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrgChart;
