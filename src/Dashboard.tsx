import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Calendar from './Calendar';
import TodoList from './TodoList';
import { Bell, Gift, X, Sparkles, Star, Palette } from 'lucide-react';

const FORTUNES = [
    "오늘은 뜻밖의 기쁜 소식이 찾아올 거예요.",
    "작은 배려가 큰 보답으로 돌아오는 하루입니다.",
    "새로운 아이디어가 번뜩이는 창의적인 날이에요.",
    "충분한 휴식이 큰 활력을 가져다줄 것입니다.",
    "주변 사람들과의 소통이 행운을 가져다줍니다.",
    "오랫동안 고민하던 일이 술술 풀릴 징조예요.",
    "나 자신을 믿고 밀고 나가면 좋은 결과가 있습니다.",
    "웃음이 끊이지 않는 즐거운 하루가 예상됩니다.",
    "계획했던 일을 시작하기에 아주 좋은 타이밍이에요.",
    "오늘은 평소보다 더 빛나는 매력을 발산하겠네요.",
    "차분한 마음가짐이 실수를 줄여줄 것입니다.",
    "작은 성공들이 모여 큰 성취를 이룰 거예요.",
    "오늘은 금전운이 매우 좋은 편이니 기대하세요.",
    "운동이나 산책으로 에너지를 충전해보세요.",
    "따뜻한 차 한 잔이 행운의 문을 열어줄 거예요."
];

const COLORS = [
    { name: '스카이 블루', hex: '#87CEEB' },
    { name: '에메랄드 그린', hex: '#50C878' },
    { name: '선셋 오렌지', hex: '#FF4E50' },
    { name: '로열 퍼플', hex: '#7851A9' },
    { name: '펄 화이트', hex: '#F0EAD6' },
    { name: '라이트 핑크', hex: '#FFB6C1' },
    { name: '미드나잇 블루', hex: '#191970' },
    { name: '레몬 옐로우', hex: '#FFF44F' }
];

const Dashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [staffData, setStaffData] = useState<any>(null);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [birthdays, setBirthdays] = useState<any[]>([]);

    // New states for modals
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
    const [selectedBirthdayPerson, setSelectedBirthdayPerson] = useState<any>(null);
    const [birthdayComments, setBirthdayComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: staff } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setUser({ ...user, staffName: staff?.name || user.email });
                setStaffData(staff);
            }
        };

        const fetchAnnouncements = async () => {
            const { data } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);
            setAnnouncements(data || []);
        };

        const fetchBirthdays = async () => {
            const today = new Date();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            const mmdd = `${month}-${day}`;

            const { data: staffList } = await supabase
                .from('staff')
                .select('id, name, birthdate');

            if (staffList) {
                const todayBirthdays = staffList.filter(s => s.birthdate && s.birthdate.endsWith(mmdd));
                setBirthdays(todayBirthdays);
            }
        };

        getUser();
        fetchAnnouncements();
        fetchBirthdays();
    }, []);

    const generateDailyFortune = () => {
        if (!staffData?.birthdate) return null;
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const seedStr = `${today}-${staffData.birthdate}`;
        
        // Simple hash function to generate a deterministic index
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
            hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
            hash |= 0;
        }
        const absHash = Math.abs(hash);
        
        return {
            fortune: FORTUNES[absHash % FORTUNES.length],
            number: (absHash % 99) + 1,
            color: COLORS[absHash % COLORS.length]
        };
    };

    const dailyFortune = generateDailyFortune();

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffDays < 1) return `${diffHours}시간 전`;
        return `${diffDays}일 전`;
    };

    const fetchBirthdayComments = async (personId: string) => {
        const year = new Date().getFullYear();
        const { data } = await supabase
            .from('birthday_comments')
            .select(`
                id,
                content,
                created_at,
                staff!author_id(name)
            `)
            .eq('target_staff_id', personId)
            .eq('year', year)
            .order('created_at', { ascending: true });

        setBirthdayComments(data || []);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !user || !selectedBirthdayPerson) return;

        const year = new Date().getFullYear();
        const { error } = await supabase.from('birthday_comments').insert({
            target_staff_id: selectedBirthdayPerson.id,
            year,
            author_id: user.id,
            content: newComment
        });

        if (!error) {
            setNewComment('');
            fetchBirthdayComments(selectedBirthdayPerson.id);
        } else {
            alert('댓글 등록에 실패했습니다.');
        }
    };

    return (
        <div className="animate-fade">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>Motiv Intelligence</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}><span style={{ color: 'var(--text-bright)', fontWeight: '600' }}>{user?.staffName || 'Guest'}</span>님, 반가워요! 오늘도 활기찬 하루 되세요. ✨</p>
                </div>

                {dailyFortune && (
                    <div className="glass" style={{ 
                        padding: '16px 24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        minWidth: '350px',
                        border: '1px solid rgba(255, 215, 0, 0.2)', // Subtle gold tint
                        background: 'rgba(255, 255, 255, 0.03)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Sparkles size={16} color="#FFD700" />
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>오늘의 운세</span>
                        </div>
                        
                        <p style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-main)', margin: 0, lineHeight: '1.4' }}>
                            "{dailyFortune.fortune}"
                        </p>
                        
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Star size={14} color="var(--primary)" />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>행운의 숫자: </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)' }}>{dailyFortune.number}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Palette size={14} color={dailyFortune.color.hex} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>행운의 컬러: </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: dailyFortune.color.hex }}>{dailyFortune.color.name}</span>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="calendar-section">
                    <Calendar />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                            <Bell size={18} className="text-primary" />
                            공지사항
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {birthdays.map((person, idx) => (
                                <div key={`bday-${idx}`}
                                    onClick={() => {
                                        setSelectedBirthdayPerson(person);
                                        fetchBirthdayComments(person.id);
                                    }}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: 'rgba(49, 64, 255, 0.05)',
                                        border: '1px solid rgba(49, 64, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer'
                                    }}
                                    className="hover-bg"
                                >
                                    <Gift size={16} color="var(--primary)" />
                                    <div>
                                        <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--primary)' }}>🥳 오늘은 {person.name}님의 생일입니다!</p>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>함께 축하해 주세요!</span>
                                    </div>
                                </div>
                            ))}

                            {announcements.length === 0 && birthdays.length === 0 ? (
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '12px' }}>공지사항이 없습니다.</p>
                            ) : (
                                announcements.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedAnnouncement(item)}
                                        style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                        className="hover-bg"
                                    >
                                        <p style={{ fontSize: '0.9rem', marginBottom: '4px', fontWeight: '500' }}>
                                            {idx + 1}) {item.title}
                                        </p>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getTimeAgo(item.created_at)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <TodoList />
                </div>
            </div>

            {/* Announcement Modal */}
            {selectedAnnouncement && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass animate-scale" style={{ width: '500px', padding: '32px', position: 'relative' }}>
                        <button
                            onClick={() => setSelectedAnnouncement(null)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>

                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '16px', paddingRight: '32px', lineHeight: '1.4' }}>
                            {selectedAnnouncement.title}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '24px', fontWeight: '500' }}>
                            등록일: {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                        </p>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px solid var(--glass-border)', minHeight: '150px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                            {selectedAnnouncement.content}
                        </div>
                    </div>
                </div>
            )}

            {/* Birthday Comments Modal */}
            {selectedBirthdayPerson && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass animate-scale" style={{ width: '500px', padding: '32px', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
                        <button
                            onClick={() => setSelectedBirthdayPerson(null)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700', margin: '0 auto 16px auto' }}>
                                🎂
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>{selectedBirthdayPerson.name}님의 생일 축하 메시지</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>따뜻한 축하의 한마디를 남겨주세요!</p>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', minHeight: '200px' }}>
                            {birthdayComments.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>아직 축하 메시지가 없습니다. 첫 번째로 축하를 남겨보세요!</p>
                            ) : (
                                birthdayComments.map(comment => (
                                    <div key={comment.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--primary)' }}>{comment.staff?.name || '알 수 없음'}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getTimeAgo(comment.created_at)}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{comment.content}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                className="input-field"
                                placeholder="축하 메시지 입력..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddComment();
                                }}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-primary" onClick={handleAddComment} disabled={!newComment.trim()}>등록</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
