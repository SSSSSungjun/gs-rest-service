import React, { useState } from 'react';

interface PostFormProps {
  onSubmit: (nickname: string, content: string) => void;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) return alert('닉네임과 본문을 모두 입력해 주세요!');
    onSubmit(nickname, content);
    setNickname('');
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="text"
        placeholder="👤 익명 닉네임 입력 (예: 개발팀 고라니)"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={styles.input}
        maxLength={20}
      />
      <textarea
        placeholder="🤫 회사에 하고 싶은 이야기를 자유롭게 털어놓으세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        style={styles.textarea}
        maxLength={1000}
      />
      <button type="submit" style={styles.button}>
        대나무숲에 메시지 던지기 🚀
      </button>
    </form>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginBottom: '32px' },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#f9fafb',
    transition: 'all 0.2s',
  },
  textarea: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    resize: 'none' as const,
    backgroundColor: '#f9fafb',
    lineHeight: '1.5',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', // 대나무숲 느낌의 초록 그래디언트
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
  },
};