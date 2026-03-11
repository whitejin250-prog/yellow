import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    AlignLeft,
    X,
    Trash2,
    Calendar as CalendarIcon
} from 'lucide-react';

interface Schedule {
    id: string;
    user_id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    color: string;
}

const Calendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [newSchedule, setNewSchedule] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        color: '#6366f1'
    });

    const colors = [
        { name: 'Indigo', value: '#6366f1' },
        { name: 'Emerald', value: '#10b981' },
        { name: 'Rose', value: '#f43f5e' },
        { name: 'Amber', value: '#f59e0b' },
        { name: 'Sky', value: '#0ea5e9' },
    ];

    useEffect(() => {
        fetchSchedules();
    }, [currentDate]);

    const fetchSchedules = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('schedules')
            .select('*');

        if (error) console.error('Error fetching schedules:', error);
        else setSchedules(data || []);
        setLoading(false);
    };

    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    const handleDateClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formatted = formatForInput(date);

        setEditingId(null);
        setNewSchedule({
            title: '',
            description: '',
            start_time: formatted,
            end_time: formatted,
            color: '#6366f1'
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (schedule: Schedule, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(schedule.id);

        // Convert ISO to local input format
        const start = new Date(schedule.start_time);
        const end = new Date(schedule.end_time);

        setNewSchedule({
            title: schedule.title,
            description: schedule.description,
            start_time: formatForInput(start),
            end_time: formatForInput(end),
            color: schedule.color
        });
        setIsModalOpen(true);
    };

    const handleSaveSchedule = async () => {
        if (!newSchedule.title) return alert('제목을 입력해주세요.');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert('로그인이 필요합니다.');

        let error;
        if (editingId) {
            const { error: updateError } = await supabase
                .from('schedules')
                .update({
                    ...newSchedule,
                    user_id: user.id
                })
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('schedules')
                .insert([{
                    ...newSchedule,
                    user_id: user.id
                }]);
            error = insertError;
        }

        if (error) alert('일정 저장 중 오류가 발생했습니다.');
        else {
            setIsModalOpen(false);
            setEditingId(null);
            setNewSchedule({ title: '', description: '', start_time: '', end_time: '', color: '#6366f1' });
            fetchSchedules();
        }
    };

    const handleDeleteSchedule = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('일정을 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', id);

        if (error) alert('삭제 중 오류가 발생했습니다.');
        else fetchSchedules();
    };

    const renderHeader = () => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-bright)' }}>
                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={prevMonth} className="btn-icon" style={{ padding: '8px' }}><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="btn" style={{ fontSize: '0.85rem' }}>오늘</button>
                <button onClick={nextMonth} className="btn-icon" style={{ padding: '8px' }}><ChevronRight size={20} /></button>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '12px' }}>
                {days.map(day => (
                    <div key={day} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', paddingBottom: '8px' }}>
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const days = [];
        const totalDays = daysInMonth(year, month);
        const offset = firstDayOfMonth(year, month);

        for (let i = 0; i < offset; i++) {
            days.push(<div key={`empty-${i}`} style={{ height: '120px', border: '1px solid rgba(255,255,255,0.03)' }}></div>);
        }

        for (let day = 1; day <= totalDays; day++) {
            const currentCellDate = new Date(year, month, day);
            const dateStr = getLocalDateString(currentCellDate);
            const daySchedules = schedules.filter(s => {
                const scheduleDate = getLocalDateString(new Date(s.start_time));
                return scheduleDate === dateStr;
            });
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            days.push(
                <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    style={{
                        height: '120px',
                        border: '1px solid var(--border)',
                        padding: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: isToday ? 'rgba(49, 64, 255, 0.05)' : 'transparent',
                        position: 'relative'
                    }}
                    className="calendar-cell-hover"
                >
                    <span style={{
                        fontSize: '0.9rem',
                        fontWeight: isToday ? '700' : '400',
                        color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                        display: 'inline-block',
                        marginBottom: '8px'
                    }}>
                        {day}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '80px' }}>
                        {daySchedules.map(s => (
                            <div
                                key={s.id}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: `${s.color}20`,
                                    color: s.color,
                                    borderLeft: `3px solid ${s.color}`,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => handleEditClick(s, e)}
                            >
                                <span>{s.title}</span>
                                <Trash2 size={10} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={(e) => handleDeleteSchedule(s.id, e)} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>{days}</div>;
    };

    return (
        <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
            {renderHeader()}
            {renderDays()}
            <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {renderCells()}
            </div>

            {isModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div className="glass" style={{ width: '450px', padding: '32px', position: 'relative' }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>

                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CalendarIcon size={24} className="text-primary" />
                            {editingId ? '일정 수정' : '일정 추가'}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>제목</label>
                                <input
                                    className="input-field"
                                    placeholder="일정 제목을 입력하세요"
                                    value={newSchedule.title}
                                    onChange={e => setNewSchedule({ ...newSchedule, title: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>시작 시간</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="datetime-local"
                                            className="input-field"
                                            style={{ paddingLeft: '40px', width: '100%' }}
                                            value={newSchedule.start_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>종료 시간</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="datetime-local"
                                            className="input-field"
                                            style={{ paddingLeft: '40px', width: '100%' }}
                                            value={newSchedule.end_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>색상 레이블</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {colors.map(c => (
                                        <div
                                            key={c.value}
                                            onClick={() => setNewSchedule({ ...newSchedule, color: c.value })}
                                            style={{
                                                width: '32px', height: '32px', borderRadius: '50%', background: c.value,
                                                cursor: 'pointer', border: newSchedule.color === c.value ? '3px solid #fff' : 'none',
                                                boxShadow: newSchedule.color === c.value ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>설명</label>
                                <div style={{ position: 'relative' }}>
                                    <AlignLeft size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                                    <textarea
                                        className="input-field"
                                        placeholder="상세 내용을 입력하세요"
                                        rows={3}
                                        style={{ paddingLeft: '40px' }}
                                        value={newSchedule.description}
                                        onChange={e => setNewSchedule({ ...newSchedule, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button onClick={handleSaveSchedule} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                                {editingId ? '수정 사항 저장하기' : '일정 추가하기'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Calendar;
