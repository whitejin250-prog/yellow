import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { CheckCircle2, Circle, Trash2, Plus, ListTodo } from 'lucide-react';

const TodoList: React.FC = () => {
    const [todos, setTodos] = useState<any[]>([]);
    const [newTask, setNewTask] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('todos')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });
            setTodos(data || []);
        }
        setLoading(false);
    };

    const addTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('todos')
                .insert([{ task: newTask, user_id: user.id }]);

            if (!error) {
                setNewTask('');
                fetchTodos();
            }
        }
    };

    const toggleTodo = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('todos')
            .update({ is_completed: !currentStatus })
            .eq('id', id);

        if (!error) {
            fetchTodos();
        }
    };

    const deleteTodo = async (id: string) => {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchTodos();
        }
    };

    return (
        <div className="glass" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListTodo size={20} className="text-primary" />
                To-do List
            </h3>

            <form onSubmit={addTodo} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                    type="text"
                    className="input-field"
                    placeholder="새로운 할 일을 입력하세요..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    style={{ flex: 1, height: '42px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 12px' }}>
                    <Plus size={20} />
                </button>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '20px' }}>불러오는 중...</p>
                ) : todos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', opacity: 0.6 }}>
                        <ListTodo size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p style={{ fontSize: '0.9rem' }}>오늘 할 일이 없습니다.</p>
                        <p style={{ fontSize: '0.8rem' }}>새로운 할 일을 추가해보세요!</p>
                    </div>
                ) : (
                    todos.map((todo) => (
                        <div
                            key={todo.id}
                            className="glass"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                padding: '12px 16px',
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <button
                                onClick={() => toggleTodo(todo.id, todo.is_completed)}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                            >
                                {todo.is_completed ? (
                                    <CheckCircle2 size={20} color="var(--success)" />
                                ) : (
                                    <Circle size={20} color="var(--text-muted)" />
                                )}
                            </button>
                            <span style={{
                                flex: 2,
                                fontSize: '0.95rem',
                                color: todo.is_completed ? 'var(--text-muted)' : 'var(--text-bright)',
                                textDecoration: todo.is_completed ? 'line-through' : 'none'
                            }}>
                                {todo.task}
                            </span>
                            <button
                                onClick={() => deleteTodo(todo.id)}
                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', opacity: 0.5 }}
                                className="hover-danger"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TodoList;
