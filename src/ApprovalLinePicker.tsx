import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Staff {
    id: string;
    name: string;
    role_level: string;
}

interface ApprovalLinePickerProps {
    onLineChange: (line: string[]) => void;
}

const ApprovalLinePicker: React.FC<ApprovalLinePickerProps> = ({ onLineChange }) => {
    const [allStaff, setAllStaff] = useState<Staff[]>([]);
    const [selectedLine, setSelectedLine] = useState<Staff[]>([]);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        const fetchStaff = async () => {
            const { data } = await supabase.from('staff').select('id, name, role_level').order('name');
            setAllStaff(data || []);
        };
        fetchStaff();
    }, []);

    const addApprover = (staff: Staff) => {
        if (selectedLine.some(s => s.id === staff.id)) return;
        const newLine = [...selectedLine, staff];
        setSelectedLine(newLine);
        onLineChange(newLine.map(s => s.id));
        setShowPicker(false);
    };

    const removeApprover = (id: string) => {
        const newLine = selectedLine.filter(s => s.id !== id);
        setSelectedLine(newLine);
        onLineChange(newLine.map(s => s.id));
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const newLine = [...selectedLine];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLine.length) return;
        
        [newLine[index], newLine[targetIndex]] = [newLine[targetIndex], newLine[index]];
        setSelectedLine(newLine);
        onLineChange(newLine.map(s => s.id));
    };

    return (
        <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                결재 라인 설정
            </label>
            <div className="glass" style={{ padding: '16px' }}>
                {selectedLine.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '12px 0' }}>
                        결재권자를 선택해 주세요. (순서대로 결재가 진행됩니다)
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {selectedLine.map((s, index) => (
                            <div key={s.id} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                padding: '10px 16px', 
                                background: 'rgba(255,255,255,0.02)', 
                                borderRadius: '10px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    borderRadius: '50%', 
                                    background: 'var(--primary)', 
                                    color: 'white', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {index + 1}
                                </div>
                                <User size={16} color="var(--primary)" />
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{s.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>({s.role_level})</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button type="button" onClick={() => moveStep(index, 'up')} disabled={index === 0} className="btn-icon" style={{ padding: '2px' }}><ChevronUp size={16} /></button>
                                    <button type="button" onClick={() => moveStep(index, 'down')} disabled={index === selectedLine.length - 1} className="btn-icon" style={{ padding: '2px' }}><ChevronDown size={16} /></button>
                                    <button type="button" onClick={() => removeApprover(s.id)} className="btn-icon" style={{ padding: '2px', color: 'var(--danger)' }}><X size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div style={{ position: 'relative' }}>
                    <button 
                        type="button"
                        className="btn btn-secondary" 
                        style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
                        onClick={() => setShowPicker(!showPicker)}
                    >
                        <Plus size={16} style={{ marginRight: '4px' }} />
                        결재권자 추가
                    </button>
                    
                    {showPicker && (
                        <div className="glass animate-fade-in" style={{ 
                            position: 'absolute', 
                            top: 'auto', 
                            bottom: '100%', 
                            left: 0, 
                            right: 0, 
                            zIndex: 10,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            marginBottom: '8px',
                            padding: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}>
                            {allStaff.filter(s => !selectedLine.some(sel => sel.id === s.id)).map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => addApprover(s)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        textAlign: 'left', 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: 'var(--text-main)',
                                        fontSize: '0.85rem',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer'
                                    }}
                                    className="hover-bg"
                                >
                                    <span>{s.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.role_level}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApprovalLinePicker;
