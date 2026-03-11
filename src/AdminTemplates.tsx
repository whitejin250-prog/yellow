import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Upload, FileText, Trash2, Plus, Edit2, X } from 'lucide-react';

const AdminTemplates: React.FC = () => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // New template form
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState<'Certificate' | 'Contract' | 'Form'>('Certificate');
    const [newDesc, setNewDesc] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Edit template state
    const [isEditing, setIsEditing] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState<'Certificate' | 'Contract' | 'Form'>('Certificate');
    const [editDesc, setEditDesc] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('document_templates')
            .select('*')
            .order('created_at', { ascending: false });
        setTemplates(data || []);
        setLoading(false);
    };

    const handleEditClick = (template: any) => {
        setEditingTemplate(template);
        setEditName(template.name);
        setEditCategory(template.category);
        setEditDesc(template.description || '');
        setEditFile(null);
        setIsEditing(true);
    };

    const handleUpdateTemplate = async () => {
        if (!editingTemplate || !editName) return alert('항목 이름은 필수입니다.');

        setIsUploading(true);
        try {
            let filePath = editingTemplate.file_path;

            // If a new file is selected, upload it and delete the old one
            if (editFile) {
                const fileExt = editFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const newFilePath = `templates/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('hr-documents')
                    .upload(newFilePath, editFile);

                if (uploadError) throw uploadError;

                // Delete old file if it exists
                if (filePath) {
                    await supabase.storage.from('hr-documents').remove([filePath]);
                }
                filePath = newFilePath;
            }

            // Update metadata in DB
            const { error: dbError } = await supabase
                .from('document_templates')
                .update({
                    name: editName,
                    category: editCategory,
                    description: editDesc,
                    file_path: filePath,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingTemplate.id);

            if (dbError) throw dbError;

            alert('양식이 성공적으로 수정되었습니다.');
            setIsEditing(false);
            setEditingTemplate(null);
            setEditFile(null);
            fetchTemplates();
        } catch (error: any) {
            alert('수정 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async () => {
        if (!newName || !selectedFile) return alert('항목 이름과 파일을 모두 입력해 주세요.');

        setIsUploading(true);
        try {
            // 1. Upload file to Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `templates/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('hr-documents')
                .upload(filePath, selectedFile);

            if (uploadError) throw uploadError;

            // 2. Save metadata to DB
            const { error: dbError } = await supabase
                .from('document_templates')
                .insert({
                    name: newName,
                    category: newCategory,
                    description: newDesc,
                    file_path: filePath
                });

            if (dbError) throw dbError;

            alert('양식이 성공적으로 업로드되었습니다.');
            // Reset form
            setNewName('');
            setNewDesc('');
            setSelectedFile(null);
            fetchTemplates();
        } catch (error: any) {
            alert('업로드 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const deleteTemplate = async (template: any) => {
        if (!window.confirm(`'${template.name}' 양식을 삭제하시겠습니까?`)) return;

        try {
            if (template.file_path) {
                await supabase.storage.from('hr-documents').remove([template.file_path]);
            }
            await supabase.from('document_templates').delete().eq('id', template.id);
            fetchTemplates();
        } catch (error: any) {
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="animate-fade">
            <header style={{ marginBottom: '32px' }}>
                <h2>문서 및 양식 관리</h2>
                <p style={{ color: 'var(--text-muted)' }}>증명서 종류를 추가하고 계약서/신청서 양식 파일을 업로드합니다.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {/* Registration Form */}
                <section className="glass" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} color="var(--primary)" /> 새 양식 등록
                    </h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>문서 상항 (이름)</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="예: 근로계약서 v2.1"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>카테고리</label>
                        <select
                            className="input-field"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value as any)}
                        >
                            <option value="Certificate">증명서 (신청용)</option>
                            <option value="Contract">계약서 (발송용)</option>
                            <option value="Form">일반 양식/신청서</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>설명 (선택)</label>
                        <textarea
                            className="input-field"
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            placeholder="문서에 대한 설명을 입력하세요..."
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>양식 파일 (Word, Excel, PDF 등)</label>
                        <div
                            style={{
                                border: '2px dashed var(--glass-border)',
                                borderRadius: '12px',
                                padding: '24px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: selectedFile ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                            }}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <Upload size={32} color={selectedFile ? 'var(--primary)' : 'var(--text-muted)'} style={{ marginBottom: '12px' }} />
                            <p style={{ fontSize: '0.85rem' }}>{selectedFile ? selectedFile.name : '파일을 선택하거나 여기에 끌어다 놓으세요'}</p>
                            <input
                                id="file-input"
                                type="file"
                                style={{ display: 'none' }}
                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,image/*"
                            />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={isUploading}
                        onClick={handleFileUpload}
                    >
                        {isUploading ? '업로드 중...' : '양식 등록하기'}
                    </button>
                </section>

                {/* Template List */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.2rem' }}>등록된 양식 목록</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>총 {templates.length}건</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {templates.map(template => (
                            <div key={template.id} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '10px' }}>
                                        <FileText size={20} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: '600' }}>{template.name}</h4>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', marginTop: '4px' }}>
                                            <span className="glass-pill" style={{ opacity: 0.8 }}>{template.category}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>버전: {new Date(template.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleEditClick(template)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                                    >
                                        <Edit2 size={18} color="var(--primary)" style={{ opacity: 0.7 }} />
                                    </button>
                                    <button
                                        onClick={() => deleteTemplate(template)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
                                    >
                                        <Trash2 size={18} color="var(--danger)" style={{ opacity: 0.7 }} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {templates.length === 0 && !loading && (
                            <div className="glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                등록된 문서 양식이 없습니다.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                    <div className="glass animate-fade" style={{ width: '100%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
                        <button
                            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            onClick={() => setIsEditing(false)}
                        >
                            <X size={20} />
                        </button>

                        <h3 style={{ marginBottom: '24px' }}>양식 수정</h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>문서 이름</label>
                            <input
                                className="input-field"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>카테고리</label>
                            <select
                                className="input-field"
                                value={editCategory}
                                onChange={e => setEditCategory(e.target.value as any)}
                            >
                                <option value="Certificate">증명서 (신청용)</option>
                                <option value="Contract">계약서 (발송용)</option>
                                <option value="Form">일반 양식/신청서</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>설명</label>
                            <textarea
                                className="input-field"
                                style={{ minHeight: '80px', resize: 'vertical' }}
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)' }}>양식 파일 교체 (선택)</label>
                            <div
                                style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: editFile ? 'rgba(49, 64, 255, 0.05)' : 'rgba(255,255,255,0.03)'
                                }}
                                onClick={() => document.getElementById('edit-file-input')?.click()}
                            >
                                <p style={{ fontSize: '0.85rem' }}>{editFile ? editFile.name : '파일을 변경하려면 클릭하세요'}</p>
                                <input
                                    id="edit-file-input"
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={e => setEditFile(e.target.files?.[0] || null)}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,image/*"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setIsEditing(false)}>취소</button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                disabled={isUploading}
                                onClick={handleUpdateTemplate}
                            >
                                {isUploading ? '저장 중...' : '수정 완료'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTemplates;
