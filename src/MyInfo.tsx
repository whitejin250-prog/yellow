import React from 'react';
import { useAuth } from './AuthContext';
import { User, Mail, Phone, MapPin, Shield, Calendar } from 'lucide-react';

const MyInfo: React.FC = () => {
    const { staff } = useAuth();


    const maskAddress = (addr: string) => {
        if (!addr) return '정보 없음';
        const words = addr.split(' ');
        if (words.length <= 2) return addr;
        return `${words[0]} ${words[1]} ******`;
    };

    const infoItems = [
        { label: '사번', value: staff?.employee_no, icon: Shield },
        { label: '성명', value: staff?.name, icon: User },
        { label: '본부', value: staff?.headquarters || '미지정', icon: Settings },
        { label: '실', value: staff?.department_office || '미지정', icon: Settings },
        { label: '팀', value: staff?.team || '미지정', icon: Settings },
        { label: '직급', value: staff?.position || '미지정', icon: Shield },
        { label: '입사일', value: staff?.join_date, icon: Calendar },
        { label: '연락처', value: staff?.phone || '정보 없음', icon: Phone },
        { label: '이메일', value: staff?.email, icon: Mail },
        { label: '상태', value: staff?.status, icon: Shield },
        { label: '생년월일', value: staff?.birthdate || '정보 없음', icon: Calendar },
        { label: '주소', value: maskAddress(staff?.address), icon: MapPin, highlighted: true },
    ];

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>내 정보 조회</h2>
                <p style={{ color: 'var(--text-muted)' }}>본인의 인사 정보 및 보안 처리된 개인정보를 확인합니다.</p>
            </header>

            <div className="glass" style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {infoItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '10px' }}>
                            <item.icon size={20} color="var(--primary)" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</p>
                            <p style={{
                                fontWeight: '600',
                                color: item.highlighted ? 'var(--warning)' : 'var(--text-main)',
                                letterSpacing: item.label === '주민번호' ? '2px' : 'normal'
                            }}>
                                {item.value || '-'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass" style={{ marginTop: '24px', padding: '16px', borderLeft: '4px solid var(--warning)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <strong>알림:</strong> 거주지 주소 일부는 보안을 위해 마스킹 처리되어 표시됩니다. 수정을 원하시면 인사팀에 문의해 주세요.
                </p>
            </div>
        </div>
    );
};

// Internal Settings icon for the map loop
const Settings = ({ size, color }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);

export default MyInfo;
