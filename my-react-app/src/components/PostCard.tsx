import { useState } from 'react';
import type { Post } from '../types/post';

interface PostCardProps {
  post: Post;
  myToken: string;
  formatDate: (dateInput: any) => string;
  onUpdate: (id: number, content: string) => void;
  onDelete: (id: number) => void;
}

export default function PostCard({ post, myToken, formatDate, onUpdate, onDelete }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  
  // 🔐 핵심 정합성 체킹: 내 기기 토큰과 작성자 토큰 일치 여부 검증
  const isMyPost = post.anonymousToken === myToken;

  const handleUpdateSubmit = () => {
    if (!editContent.trim()) return alert('내용을 입력하세요.');
    onUpdate(post.id, editContent);
    setIsEditing(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.nickname}>{post.nickname} {isMyPost && <span style={styles.myBadge}>내 글</span>}</span>
        <span style={styles.date}>{formatDate(post.createdAt)}</span>
      </div>

      {isEditing ? (
        <div style={styles.editArea}>
          <textarea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)} 
            style={styles.textarea}
            rows={3}
          />
          <div style={styles.btnGroup}>
            <button onClick={handleUpdateSubmit} style={styles.saveBtn}>수정 완료</button>
            <button onClick={() => setIsEditing(false)} style={styles.cancelBtn}>취소</button>
          </div>
        </div>
      ) : (
        <>
          <p style={styles.content}>{post.content}</p>
          {isMyPost && (
            <div style={styles.actionRow}>
              <span onClick={() => setIsEditing(true)} style={styles.actionAction}>수정</span>
              <span onClick={() => onDelete(post.id)} style={{ ...styles.actionAction, color: '#ef4444' }}>삭제</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  card: { padding: '16px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  nickname: { fontWeight: '600', color: '#334155', fontSize: '14px' },
  myBadge: { fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' },
  date: { fontSize: '11px', color: '#94a3b8' },
  content: { margin: '0 0 8px 0', color: '#1e293b', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' as const },
  actionRow: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  actionAction: { fontSize: '12px', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' },
  editArea: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  textarea: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'none' as const },
  btnGroup: { display: 'flex', gap: '6px', justifyContent: 'flex-end' },
  saveBtn: { padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' },
  cancelBtn: { padding: '4px 10px', background: '#cbd5e1', color: '#334155', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }
};