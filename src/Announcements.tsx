import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Bell, X } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

const Announcements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Announcement | null>(null);

    useEffect(() => {
        const fetch = async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error) setAnnouncements(data || []);
            setLoading(false);
        };
        fetch();
    }, []);

    return (
        <div className="animate-fade" style={{ padding: '32px' }}>
            <header style={{ marginBottom: '32px' }}>
                <h2>공지사항</h2>
                <p style={{ color: 'var(--text-muted)' }}>전체 사용자에게 표시되는 공지사항 목록입니다.</p>
            </header>
            <div className="glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>제목</th>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>등록일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>로딩 중...</td>
                            </tr>
                        ) : announcements.length === 0 ? (
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>공지사항이 없습니다.</td>
                            </tr>
                        ) : (
                            announcements.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }} onClick={() => setSelected(item)}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Bell size={16} className="text-primary" />
                                            <span style={{ fontWeight: '500' }}>{item.title}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for selected announcement */}
            {selected && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass animate-scale" style={{ width: '500px', padding: '32px', position: 'relative' }}>
                        <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={24} />
                        </button>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={24} className="text-primary" /> {selected.title}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>{new Date(selected.created_at).toLocaleDateString()}</p>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{selected.content}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Announcements;
