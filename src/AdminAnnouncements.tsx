import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
    PlusCircle,
    Trash2,
    Edit2,
    Bell,
    X,
    ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

const AdminAnnouncements: React.FC = () => {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching announcements:', error);
        else setAnnouncements(data || []);
        setLoading(false);
    };

    const handleOpenAddModal = () => {
        setEditingAnnouncement({ title: '', content: '' });
        setShowModal(true);
    };

    const handleOpenEditModal = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingAnnouncement(null);
    };

    const handleSave = async () => {
        if (!editingAnnouncement?.title) return alert('제목을 입력해주세요.');

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        const announcementData = {
            title: editingAnnouncement.title,
            content: editingAnnouncement.content,
            author_id: user?.id
        };

        let error;
        if (editingAnnouncement.id) {
            const { error: updateError } = await supabase
                .from('announcements')
                .update(announcementData)
                .eq('id', editingAnnouncement.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('announcements')
                .insert([announcementData]);
            error = insertError;
        }

        if (error) {
            alert('공지사항 저장 중 오류가 발생했습니다.');
            console.error(error);
        } else {
            handleCloseModal();
            fetchAnnouncements();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('공지사항을 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) {
            alert('삭제 중 오류가 발생했습니다.');
            console.error(error);
        } else {
            fetchAnnouncements();
        }
    };

    return (
        <div className="animate-fade" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate(-1)} className="btn-icon">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '4px' }}>공지사항 관리</h1>
                        <p style={{ color: 'var(--text-muted)' }}>전체 사용자에게 노출될 공지사항을 관리합니다.</p>
                    </div>
                </div>
                <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ gap: '8px' }}>
                    <PlusCircle size={18} />
                    공지 등록
                </button>
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>제목</th>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>등록일</th>
                            <th style={{ textAlign: 'center', padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>로딩 중...</td>
                            </tr>
                        ) : announcements.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                    등록된 공지사항이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            announcements.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Bell size={16} className="text-primary" />
                                            <span style={{ fontWeight: '500' }}>{item.title}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => handleOpenEditModal(item)}
                                                className="btn-icon hover-primary"
                                                title="수정"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="btn-icon hover-danger"
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass" style={{ width: '500px', padding: '32px', position: 'relative' }}>
                        <button
                            onClick={handleCloseModal}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>

                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Bell size={24} className="text-primary" />
                            {editingAnnouncement?.id ? '공지사항 수정' : '신규 공지 등록'}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>제목</label>
                                <input
                                    className="input-field"
                                    placeholder="공지 제목을 입력하세요"
                                    value={editingAnnouncement?.title || ''}
                                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>내용</label>
                                <textarea
                                    className="input-field"
                                    placeholder="공지 내용을 입력하세요"
                                    rows={6}
                                    value={editingAnnouncement?.content || ''}
                                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button onClick={handleCloseModal} className="btn" style={{ flex: 1, justifyContent: 'center' }}>취소</button>
                                <button
                                    onClick={handleSave}
                                    className="btn btn-primary"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    disabled={saving}
                                >
                                    {saving ? '저장 중...' : (editingAnnouncement?.id ? '수정 완료' : '등록 하기')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnnouncements;
