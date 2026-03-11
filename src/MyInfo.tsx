import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { User, Mail, Phone, MapPin, Shield, Calendar, ShieldCheck, Globe, PenTool, Download, Settings } from 'lucide-react';

const MyInfo: React.FC = () => {
    const { staff } = useAuth();
    const [contracts, setContracts] = useState<any[]>([]);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signingContractId, setSigningContractId] = useState<string | null>(null);
    const [signatureImage, setSignatureImage] = useState<string | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (staff?.id) {
            fetchContracts();
        }
    }, [staff?.id]);

    const fetchContracts = async () => {
        const { data } = await supabase
            .from('approval')
            .select('*, signature(*)')
            .eq('requester_id', staff?.id)
            .eq('doc_type', 'Contract')
            .order('request_date', { ascending: false });
        setContracts(data || []);
    };

    const startSigning = (docId: string) => {
        setSigningContractId(docId);
        setSignatureImage(null);
        setIsSignatureModalOpen(true);
    };

    const handleSign = async () => {
        if (!signingContractId || !signatureImage) {
            alert('서명 또는 도장 이미지가 필요합니다.');
            return;
        }

        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipResponse.json();

            const { error } = await supabase
                .from('signature')
                .upsert({
                    doc_id: signingContractId,
                    signed_at: new Date().toISOString(),
                    ip_address: ip,
                    is_completed: true,
                    signature_image: signatureImage
                });

            if (!error) {
                alert('서명이 완료되었습니다. IP와 타임스탬프가 보안 로그에 기록되었습니다.');
                setIsSignatureModalOpen(false);
                fetchContracts();
            }
        } catch (err) {
            console.error('Signing error:', err);
            alert('서명 중 오류가 발생했습니다.');
        }
    };

    const handleDownload = (contract: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const content = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>표준 근로계약서 - ${staff?.name}</title>
                    <style>
                        body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                        .header { text-align: center; margin-bottom: 50px; }
                        .title { font-size: 24px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .section { margin-bottom: 30px; }
                        .section-title { font-weight: bold; margin-bottom: 10px; border-left: 4px solid #333; padding-left: 10px; }
                        .info-grid { display: grid; grid-template-columns: 100px 1fr; gap: 10px; margin-bottom: 10px; }
                        .signature-box { margin-top: 50px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #f9f9f9; position: relative; }
                        .footer { margin-top: 100px; text-align: center; font-size: 0.9em; color: #666; }
                        .sign-image { position: absolute; right: 40px; bottom: 20px; max-width: 120px; max-height: 80px; object-fit: contain; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="title">표준 근로계약서</h1>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">1. 계약 당사자</div>
                        <div class="info-grid">
                            <strong>사용자:</strong> (주)모티브아이앤씨
                        </div>
                        <div class="info-grid">
                            <strong>근로자:</strong> ${staff?.name} (사번: ${staff?.employee_no})
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">2. 근로 조건</div>
                        <p>본 계약은 대한민국의 근로기준법을 준수하며, 당사자 간의 합의에 의해 작성되었습니다. 상세 근로 시간, 임금, 휴게 시간 등은 사규 및 관련 법령에 따릅니다.</p>
                    </div>

                    <div class="section">
                        <div class="section-title">3. 보안 및 준수사항</div>
                        <p>근로자는 업무 수행 중 알게 된 회사의 기밀 정보를 제3자에게 누설하지 않으며, 퇴사 후에도 이를 준수할 것을 약속합니다.</p>
                    </div>

                    <div class="signature-box">
                        <div class="section-title">전자 서명 정보</div>
                        <div class="info-grid">
                            <strong>서명일시:</strong> ${new Date(contract.signature.signed_at).toLocaleString()}
                        </div>
                        <div class="info-grid">
                            <strong>IP 주소:</strong> ${contract.signature.ip_address}
                        </div>
                        <div class="info-grid">
                            <strong>인증상태:</strong> 전자서명법에 따른 유효한 서명
                        </div>
                        <div style="margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; padding-right: 60px;">
                            서명인: ${staff?.name}
                        </div>
                        ${contract.signature.signature_image ? `<img src="${contract.signature.signature_image}" class="sign-image" />` : ''}
                    </div>

                    <div class="footer">
                        <p>본 문서는 HR 시스템을 통해 전자적으로 생성되었으며, 종이 문서와 동일한 법적 효력을 가집니다.</p>
                        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer; background: #333; color: #fff; border: none; border-radius: 4px;">PDF로 저장 / 인쇄</button>
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    // Canvas Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.beginPath(); // Start a new path for each drawing stroke
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            setSignatureImage(canvasRef.current.toDataURL());
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const clearCanvas = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setSignatureImage(null);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignatureImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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
        <div className="animate-fade" style={{ paddingBottom: '40px' }}>
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

            {/* Labor Contract Section */}
            <div style={{ marginTop: '48px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck color="var(--primary)" size={24} />
                    내 근로계약 정보
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {contracts.map(contract => (
                        <div key={contract.id} className="glass" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>표준 근로계약서</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>발송일: {new Date(contract.request_date).toLocaleDateString()}</p>
                                </div>
                                <span className="glass-pill" style={{
                                    color: contract.signature?.is_completed ? 'var(--success)' : 'var(--warning)',
                                    fontSize: '0.8rem'
                                }}>
                                    {contract.signature?.is_completed ? '서명완료' : '서명대기'}
                                </span>
                            </div>

                            {contract.signature?.is_completed ? (
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} color="var(--primary)" />
                                            <span>서명일시: {new Date(contract.signature.signed_at).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Globe size={14} color="var(--primary)" />
                                            <span>IP주소: {contract.signature.ip_address}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDownload(contract)}
                                        className="btn btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Download size={14} />
                                        다운로드
                                    </button>
                                </div>
                            ) : (
                                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => startSigning(contract.id)}>
                                    <PenTool size={16} />
                                    전자서명 하기
                                </button>
                            )}
                        </div>
                    ))}

                    {contracts.length === 0 && (
                        <div className="glass" style={{ padding: '32px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>조회된 근로계약 정보가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Signature Modal */}
            {isSignatureModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass" style={{ width: '90%', maxWidth: '500px', padding: '32px' }}>
                        <h3 style={{ marginBottom: '24px' }}>전자서명 / 도장 날인</h3>
                        
                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>아래 영역에 서명하거나 도장 이미지를 업로드하세요.</p>
                            
                            <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', height: '200px', position: 'relative' }}>
                                <canvas
                                    ref={canvasRef}
                                    width={500}
                                    height={200}
                                    style={{ width: '100%', height: '100%', cursor: 'crosshair', position: 'absolute', top: 0, left: 0 }}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                                {signatureImage && (
                                    <img src={signatureImage} alt="Signature Preview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', background: '#fff', objectFit: 'contain' }} />
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={clearCanvas}>새로 고침</button>
                                <label className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'pointer' }}>
                                    도장 업로드
                                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setIsSignatureModalOpen(false)}>취소</button>
                            <button className="btn btn-primary" onClick={handleSign} disabled={!signatureImage}>서명 완료</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyInfo;
