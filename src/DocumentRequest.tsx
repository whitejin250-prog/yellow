import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { FileText, Send, Download, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ApprovalLinePicker from './ApprovalLinePicker';

const DocumentRequest: React.FC = () => {
    const { staff } = useAuth();
    const [docTypes, setDocTypes] = useState<any[]>([]);
    const [docType, setDocType] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [approvalLine, setApprovalLine] = useState<string[]>([]);

    useEffect(() => {
        fetchTemplates();
        fetchRequests();
    }, []);

    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('document_templates')
            .select('name, file_path')
            .eq('category', 'Certificate');
        setDocTypes(data || []);
        if (data && data.length > 0) setDocType(data[0].name);
    };

    const fetchRequests = async () => {
        const { data } = await supabase
            .from('approval')
            .select('*')
            .eq('requester_id', staff.id)
            .order('request_date', { ascending: false });
        setRequests(data || []);
    };

    const handleDownload = async (req: any) => {
        // If "재직증명서", auto-generate from HTML template
        if (req.doc_type === '재직증명서') {
            setGeneratingPdf(true);
            try {
                // To render the hidden div, we temporarily unhide it, capture, then hide again
                const el = document.getElementById('certificate-template');
                if (el) {
                    el.style.display = 'block';
                    const canvas = await html2canvas(el, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');

                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`${staff.name}_${req.doc_type}.pdf`);

                    el.style.display = 'none';
                }
            } catch (err) {
                console.error("PDF generation failed:", err);
                alert("PDF 생성 중 오류가 발생했습니다.");
            } finally {
                setGeneratingPdf(false);
            }
            return;
        }

        // 1. Find the template from storage
        const template = docTypes.find(t => t.name === req.doc_type);

        if (template && template.file_path) {
            const { data } = await supabase.storage.from('hr-documents').getPublicUrl(template.file_path);
            if (data?.publicUrl) {
                // Open file in new tab or download
                const link = document.createElement('a');
                link.href = data.publicUrl;
                link.download = `${staff.name}_${req.doc_type}.${template.file_path.split('.').pop()}`;
                link.target = '_blank';
                link.click();
                return;
            }
        }

        // Fallback for jsPDF (broken for Korean, but keeping logic structure)
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(req.doc_type, 105, 40, { align: 'center' });
        doc.save(`${staff.name}_${req.doc_type}.pdf`);
    };
    const handleDeleteRequest = async (id: string) => {
        if (!window.confirm('정말 이 신청 내역을 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('approval')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchRequests();
        } else {
            alert('삭제 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const [showSuccess, setShowSuccess] = useState(false);

    const handleRequest = async () => {
        if (!docType) return alert('증명서 종류를 선택해 주세요.');
        if (!purpose) return alert('용도를 입력해 주세요.');
        if (approvalLine.length === 0) return alert('결재 라인을 설정해 주세요.');

        setLoading(true);
        const { data: reqData, error } = await supabase.from('approval').insert({
            requester_id: staff.id,
            doc_type: docType,
            purpose: purpose,
            status: 'Pending',
            request_date: new Date().toISOString()
        }).select();

        if (!error && reqData) {
            // Insert approval steps
            const steps = approvalLine.map((approverId, index) => ({
                request_id: reqData[0].id,
                request_type: 'certificate',
                approver_id: approverId,
                step_order: index + 1,
                status: 'Pending'
            }));

            await supabase.from('approval_steps').insert(steps);

            setShowSuccess(true);
            setPurpose('');
            setApprovalLine([]);
            fetchRequests();
            setTimeout(() => setShowSuccess(false), 3000);
        } else {
            alert('신청 중 오류가 발생했습니다: ' + (error?.message || 'Unknown error'));
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>증명서 신청</h2>
                <p style={{ color: 'var(--text-muted)' }}>필요한 증명서를 신청하면 인사팀의 승인 후 다운로드 가능합니다.</p>
            </header>

            <div className="glass" style={{ padding: '24px', marginBottom: '32px', position: 'relative' }}>
                {showSuccess && (
                    <div className="animate-fade-in" style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--success)',
                        color: 'white',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 10
                    }}>
                        ✅ 신청이 성공적으로 완료되었습니다!
                    </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>증명서 종류</label>
                        <select
                            className="input-field"
                            value={docType}
                            onChange={e => setDocType(e.target.value)}
                        >
                            <option value="재직증명서">재직증명서 (자동 발급)</option>
                            {docTypes.filter(t => t.name !== '재직증명서').map(t => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                            ))}
                            {docTypes.length === 0 && <option value="">등록된 증명서가 없습니다.</option>}
                        </select>
                    </div>
                    <div style={{ marginBottom: '20px', flex: '1 1 200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>용도 (필수)</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="예: 은행 제출용, 관공서 제출용 등"
                            value={purpose}
                            onChange={e => setPurpose(e.target.value)}
                        />
                    </div>
                </div>

                <ApprovalLinePicker onLineChange={setApprovalLine} />

                <button className="btn btn-primary" onClick={handleRequest} disabled={loading} style={{ width: '100%', height: '48px', justifyContent: 'center' }}>
                    <Send size={18} />
                    {loading ? '신청 중...' : '신청하기'}
                </button>
            </div>

            <h3>신청 내역</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map(req => (
                    <div key={req.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FileText size={24} color="var(--primary)" />
                            <div>
                                <p style={{ fontWeight: '600' }}>{req.doc_type}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDateTime(req.request_date)}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="glass-pill" style={{
                                color: req.status === 'Approved' ? 'var(--success)' : req.status === 'Pending' ? 'var(--warning)' : 'var(--danger)'
                            }}>
                                {req.status === 'Approved' ? '승인완료' : req.status === 'Pending' ? '대기중' : '반려'}
                            </span>
                            {req.status === 'Approved' && (
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    onClick={() => handleDownload(req)}
                                    disabled={generatingPdf}
                                >
                                    <Download size={14} />
                                    {generatingPdf && req.doc_type === '재직증명서' ? '생성 중...' : '다운로드'}
                                </button>
                            )}
                            <button
                                onClick={() => handleDeleteRequest(req.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="신청 내역 삭제"
                            >
                                <Trash2 size={18} color="var(--danger)" style={{ opacity: 0.6 }} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hidden Certificate Template */}
            <div id="certificate-template" style={{ display: 'none', width: '210mm', minHeight: '297mm', padding: '20mm', background: 'white', color: 'black', fontFamily: 'sans-serif', position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#3140FF', marginRight: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px' }}>M</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Motiv<br />Intelligence</div>
                </div>

                <h1 style={{ textAlign: 'center', fontSize: '36px', letterSpacing: '8px', margin: '40px 0 60px 0' }}>재 직 증 명 서</h1>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '40px' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={2} style={{ width: '15%', border: '1px solid black', background: '#e2f0d9', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>인 적 사 항</td>
                            <td style={{ width: '15%', border: '1px solid black', background: '#e2f0d9', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>성 명</td>
                            <td style={{ width: '35%', border: '1px solid black', padding: '15px', textAlign: 'center' }}>{staff.name}</td>
                            <td style={{ width: '15%', border: '1px solid black', background: '#e2f0d9', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>생 년 월 일</td>
                            <td style={{ width: '20%', border: '1px solid black', padding: '15px', textAlign: 'center' }}>{staff.birthdate}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', background: '#e2f0d9', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>주 소</td>
                            <td colSpan={3} style={{ border: '1px solid black', padding: '15px' }}>{staff.address}</td>
                        </tr>

                        <tr>
                            <td rowSpan={3} style={{ border: '1px solid black', background: '#ddebf7', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>재 직 사 항</td>
                            <td style={{ border: '1px solid black', background: '#ddebf7', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>소 속</td>
                            <td colSpan={3} style={{ border: '1px solid black', padding: '15px', textAlign: 'center' }}>{staff.department}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', background: '#ddebf7', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>직 위</td>
                            <td colSpan={3} style={{ border: '1px solid black', padding: '15px', textAlign: 'center' }}>{staff.job_title}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', background: '#ddebf7', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>기 간</td>
                            <td colSpan={2} style={{ border: '1px solid black', padding: '15px', textAlign: 'center' }}>{staff.hire_date} ~ 현재</td>
                            <td style={{ border: '1px solid black', background: '#ddebf7', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>재 직 여 부</td>
                        </tr>

                        <tr>
                            <td colSpan={2} style={{ border: '1px solid black', background: '#ddebf7', textAlign: 'center', fontWeight: 'bold', padding: '15px' }}>용 도</td>
                            <td colSpan={3} style={{ border: '1px solid black', padding: '15px', textAlign: 'center' }}>{requests.find(r => r.doc_type === '재직증명서' && r.status === 'Approved')?.purpose || '제출용'}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ position: 'relative', marginTop: '100px', textAlign: 'center' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, fontSize: '150px', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                        Motiv<br />Intelligence
                    </div>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '80px', position: 'relative', zIndex: 1 }}>
                        상기인은 위와 같이 현재 재직 중에 있음을 증명합니다.
                    </p>
                    <p style={{ fontSize: '18px', marginBottom: '40px' }}>
                        {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '40px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold', marginRight: '20px' }}>주식회사 모티브인텔리전스 대표이사</span>
                        <div style={{ width: '80px', height: '80px', border: '3px solid #d32f2f', color: '#d32f2f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', transform: 'rotate(-15deg)' }}>
                            직인
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentRequest;
