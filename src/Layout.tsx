import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { LayoutDashboard, FileText, UserCircle, ShieldCheck, Mail, LogOut, Users, Settings, Bell, GitBranch, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen, toggleSidebar }) => {
    const { staff, signOut, isAdminMode, setIsAdminMode, refreshStaff } = useAuth();
    const location = useLocation();

    const isAdmin = staff?.role_level === 'Admin';

    const menuItems = [
        { name: '홈', icon: LayoutDashboard, path: '/', roles: ['Admin', 'User'] },
        {
            name: '게시판',
            icon: Bell,
            roles: ['Admin', 'User'],
            children: [
                { name: '공지사항', icon: Bell, path: '/announcements', roles: ['Admin', 'User'] },
                { name: '조직도', icon: GitBranch, path: '/org-chart', roles: ['Admin', 'User'] },
            ]
        },
        {
            name: '전자결재',
            icon: ShieldCheck,
            roles: ['Admin', 'User'],
            children: [
                { name: '경비 신청', icon: Bell, path: '/expense-request', roles: ['Admin', 'User'] },
                { name: '증명서 신청', icon: FileText, path: '/request', roles: ['Admin', 'User'] },
                { name: '결재문서관리', icon: FileText, path: '/admin/approvals', roles: ['Admin', 'User'] },
            ]
        },
        { name: '내 정보 조회', icon: UserCircle, path: '/my-info', roles: ['Admin', 'User'], userOnly: true },
        // Admin Only Items (Management)
        { name: '전체 직원 관리', icon: Users, path: '/admin/staff', roles: ['Admin'], adminOnly: true },
        { name: '공지사항 관리', icon: Bell, path: '/admin/announcements', roles: ['Admin'], adminOnly: true },
        { name: '양식/종류 관리', icon: Settings, path: '/admin/templates', roles: ['Admin'], adminOnly: true },
        { name: '계약서 발송', icon: Mail, path: '/admin/send-contract', roles: ['Admin'], adminOnly: true },
    ];

    const [pendingCount, setPendingCount] = useState<number>(0);
    const [openMenus, setOpenMenus] = useState<string[]>(['게시판', '전자결재']);

    const toggleMenu = (name: string) => {
        setOpenMenus(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    };

    const fetchPendingCounts = async () => {
        if (!staff?.id) return;
        
        const { data: steps, error } = await supabase
            .from('approval_steps')
            .select('*')
            .eq('approver_id', staff.id)
            .eq('status', 'Pending');
            
        if (error || !steps) {
            setPendingCount(0);
            return;
        }

        let turnCount = 0;
        for (const step of steps) {
            const { data: prevSteps } = await supabase
                .from('approval_steps')
                .select('status')
                .eq('request_id', step.request_id)
                .lt('step_order', step.step_order);
            
            if ((prevSteps || []).every(ps => ps.status === 'Approved')) {
                turnCount++;
            }
        }
        
        setPendingCount(turnCount);
    };

    useEffect(() => {
        fetchPendingCounts();
    }, [isAdminMode, location.pathname, staff?.id]);

    const filterItems = (items: any[]): any[] => {
        return items.filter(item => {
            if (isAdminMode) {
                return item.roles.includes('Admin');
            } else {
                return item.roles.includes('User') && !item.adminOnly;
            }
        }).map(item => {
            if (item.children) {
                return { ...item, children: filterItems(item.children) };
            }
            return item;
        }).filter(item => !item.children || item.children.length > 0);
    };

    const filteredItems = filterItems(menuItems);

    const renderMenuItem = (item: any, isSubItem = false) => {
        const isActive = location.pathname === item.path;
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openMenus.includes(item.name);
        
        let badge = 0;
        if (item.name === '결재문서관리') badge = pendingCount;

        const content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <item.icon size={isSubItem ? 18 : 20} />
                <span style={{ 
                    fontSize: isSubItem ? '0.85rem' : '1rem',
                    fontWeight: isSubItem ? (isActive ? '600' : '500') : '600'
                }}>{item.name}</span>
            </div>
        );

        if (hasChildren) {
            return (
                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                        onClick={() => toggleMenu(item.name)}
                        className="btn"
                        style={{
                            justifyContent: 'space-between',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderRadius: '12px'
                        }}
                    >
                        {content}
                        <svg 
                            style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', opacity: 0.6 }}
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </div>
                    {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '24px' }}>
                            {item.children.map((child: any) => renderMenuItem(child, true))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.path}
                to={item.path}
                className={`btn ${isActive ? 'btn-primary' : ''}`}
                onClick={() => {
                    if (window.innerWidth <= 768) {
                        toggleSidebar();
                    }
                }}
                style={{
                    justifyContent: 'space-between',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-main)',
                    padding: isSubItem ? '8px 16px' : '12px 16px',
                    borderRadius: '12px',
                    textDecoration: 'none'
                }}
            >
                {content}
                {badge > 0 && (
                    <span style={{
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                    }}>
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
            {/* Mobile close button */}
            <button
                className="btn-icon"
                style={{ position: 'absolute', top: '16px', right: '16px', display: 'none' /* handled by media query or just always show on mobile if needed, but we have toggle */ }}
                onClick={toggleSidebar}
            >
                {/* <X size={20} /> */}
            </button>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>HR System</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {staff?.name || 'Loading...'} ({staff?.role_level || 'User'})
                    </p>
                    <button
                        onClick={refreshStaff}
                        style={{ padding: '2px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                        title="새로고침"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    </button>
                </div>
            </div>

            {isAdmin && (
                <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>관리자 모드</span>
                        <div
                            onClick={() => setIsAdminMode(!isAdminMode)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: isAdminMode ? 'var(--primary)' : '#ccc',
                                borderRadius: '20px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                background: 'white',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isAdminMode ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                        {isAdminMode ? '관리자용 메뉴가 활성화되었습니다.' : '일반 직원 모드입니다.'}
                    </p>
                </div>
            )}

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {filteredItems.map(item => renderMenuItem(item))}
            </nav>

            <button
                onClick={signOut}
                className="btn"
                style={{ marginTop: 'auto', background: 'transparent', color: 'var(--danger)' }}
            >
                <LogOut size={20} />
                로그아웃
            </button>
        </aside>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { loading, user, staff } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    if (loading) return <div style={{ color: 'white', padding: '20px' }}>Loading...</div>;

    if (!user) return <div className="animate-fade">{children}</div>; // Login page

    if (staff?.status === 'Pending') {
        return (
            <div className="container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div className="glass" style={{ padding: '40px', maxWidth: '400px' }}>
                    <ShieldCheck size={48} color="var(--warning)" style={{ marginBottom: '20px' }} />
                    <h2>승인 대기 중</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>가입 승인 대기 중인 사용자는 '승인 대기 중' 메시지만 노출됩니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <div className="mobile-header">
                <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Motiv HR</h1>
                <button className="btn-icon" onClick={toggleSidebar} style={{ padding: '8px', border: 'none', background: 'transparent' }}>
                    {isSidebarOpen ? <X size={24} color="var(--text-main)" /> : <Menu size={24} color="var(--text-main)" />}
                </button>
            </div>
            {isSidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <main className="main-content" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
                {children}
            </main>
        </div>
    );
};

export default Layout;
