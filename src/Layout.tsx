import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LayoutDashboard, FileText, UserCircle, ShieldCheck, Mail, LogOut, Users, Phone, Settings, Bell, GitBranch, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen, toggleSidebar }) => {
    const { staff, signOut, isAdminMode, setIsAdminMode, refreshStaff } = useAuth();
    const location = useLocation();

    const isAdmin = staff?.role_level === 'Admin';

    const menuItems = [
        { name: '홈', icon: LayoutDashboard, path: '/', roles: ['Admin', 'User'] },
        { name: '조직도', icon: GitBranch, path: '/org-chart', roles: ['Admin', 'User'] },
        // Admin Only Items
        { name: '전체 직원 관리', icon: Users, path: '/admin/staff', roles: ['Admin'], adminOnly: true },
        { name: '공지사항 관리', icon: Bell, path: '/admin/announcements', roles: ['Admin'], adminOnly: true },
        { name: '경비 신청', icon: Bell, path: '/expense-request', roles: ['User'], userOnly: true },
        { name: '경비 보고', icon: Bell, path: '/admin/expense-reports', roles: ['Admin'], adminOnly: true },
        { name: '공지사항', icon: Bell, path: '/announcements', roles: ['Admin', 'User'] },
        { name: '결재 대기 목록', icon: FileText, path: '/admin/approvals', roles: ['Admin'], adminOnly: true },
        { name: '양식/종류 관리', icon: Settings, path: '/admin/templates', roles: ['Admin'], adminOnly: true },
        { name: '계약서 발송', icon: Mail, path: '/admin/send-contract', roles: ['Admin'], adminOnly: true },
        // User Only Items
        { name: '내 정보 조회', icon: UserCircle, path: '/my-info', roles: ['User'], userOnly: true },
        { name: '증명서 신청', icon: FileText, path: '/request', roles: ['User'], userOnly: true },
        { name: '비상연락망', icon: Phone, path: '/contacts', roles: ['User'], userOnly: true },
        { name: '내 근로계약서', icon: ShieldCheck, path: '/contracts', roles: ['User'], userOnly: true },
    ];

    const filteredItems = menuItems.filter(item => {
        // Dashboard is always visible if the user has either role
        if (item.name === 'Dashboard') {
            return item.roles.includes(staff?.role_level || 'User');
        }

        if (isAdminMode) {
            return item.roles.includes('Admin');
        } else {
            // In user mode, show user-specific items and items that are not admin-only
            return item.roles.includes('User') && !item.adminOnly;
        }
    });

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
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {isAdminMode ? '관리자용 메뉴가 활성화되었습니다.' : '일반 직원 모드입니다.'}
                    </p>
                </div>
            )}

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`btn ${location.pathname === item.path ? 'btn-primary' : ''}`}
                        onClick={() => {
                            if (window.innerWidth <= 768) {
                                toggleSidebar();
                            }
                        }}
                        style={{
                            justifyContent: 'flex-start',
                            background: location.pathname === item.path ? 'var(--primary)' : 'transparent',
                            color: location.pathname === item.path ? 'white' : 'var(--text-muted)',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            fontWeight: location.pathname === item.path ? '600' : '500'
                        }}
                    >
                        <item.icon size={20} />
                        {item.name}
                    </Link>
                ))}
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
