import React, { useState } from 'react';
import { supabase } from './supabase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [empNo, setEmpNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) throw signUpError;
                if (data.user) {
                    // Create staff entry
                    const { error: staffError } = await supabase.from('staff').insert({
                        id: data.user.id,
                        employee_no: empNo,
                        name: name,
                        email: email,
                        status: 'Pending',
                        role_level: 'User'
                    });
                    if (staffError) throw staffError;
                }
                alert('회원가입 요청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.');
            } else {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (loginError) throw loginError;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass animate-fade" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>
                    {isSignUp ? '인사시스템 가입' : '로그인'}
                </h2>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isSignUp && (
                        <>
                            <input
                                className="input-field"
                                placeholder="이름"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                            <input
                                className="input-field"
                                placeholder="사번"
                                value={empNo}
                                onChange={e => setEmpNo(e.target.value)}
                                required
                            />
                        </>
                    )}
                    <input
                        className="input-field"
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <input
                        className="input-field"
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />

                    {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}

                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? '처리 중...' : (isSignUp ? '가입 신청' : '로그인')}
                    </button>
                </form>

                <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {isSignUp ? '이미 계정이 있나요?' : '처음이신가요?'} {' '}
                    <span
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? '로그인' : '가입 신청'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Login;
