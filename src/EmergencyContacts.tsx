import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Phone, Mail, Heart } from 'lucide-react';

const EmergencyContacts: React.FC = () => {
    const [contacts, setContacts] = useState<any[]>([]);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        const { data: staffData } = await supabase
            .from('staff')
            .select('id, name, department, position, phone, email')
            .eq('status', 'Active')
            .order('name');

        if (staffData) {
            const { data: contactData } = await supabase
                .from('emergency_contacts')
                .select('*');

            const merged = staffData.map(s => ({
                ...s,
                emergency: contactData?.find(c => c.staff_id === s.id)
            }));
            setContacts(merged);
        }
    };

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>비상연락망</h2>
                <p style={{ color: 'var(--text-muted)' }}>동료들의 연락처와 부서 정보를 확인할 수 있습니다. (조회 전용)</p>
            </header>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px 24px' }}>성명 / 부서</th>
                            <th style={{ padding: '16px 24px' }}>직원 연락처</th>
                            <th style={{ padding: '16px 24px' }}>비상연락망 (가족/지인)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contacts.map((contact, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'var(--primary)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                            {contact.name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{contact.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{contact.department || '미지정'} / {contact.position || '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Phone size={14} color="var(--text-muted)" />
                                        {contact.phone || '-'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <Mail size={14} color="var(--text-muted)" />
                                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{contact.email}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    {contact.emergency ? (
                                        <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Heart size={12} color="var(--danger)" />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{contact.emergency.contact_name}</span>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({contact.emergency.relationship})</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{contact.emergency.phone}</div>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>미등록</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmergencyContacts;
