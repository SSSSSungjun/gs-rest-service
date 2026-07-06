import { useState, useEffect } from 'react'
import axios from 'axios'

interface Post {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')

  // 1. 서버에서 익명 글 리스트 가져오기
  const fetchPosts = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8081/api/posts')
      setPosts(response.data)
    } catch (error) {
      console.error("서버 연결 실패", error)
    }
  }

  // 2. 글 쓰기 버튼 클릭
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname || !password || !content) return alert('빈칸을 다 채워주세요!')

    try {
      await axios.post('http://127.0.0.1:8081/api/posts', { nickname, password, content })
      setNickname('')
      setPassword('')
      setContent('')
      fetchPosts() // 글 쓰고 나서 리스트 새로고침
    } catch (error) {
      alert('글 등록 실패!')
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  return (
    // ⭐️ 전체 배경 및 모바일 반응형 컨테이너 세팅 (스마트폰 최적화)
    <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '12px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '16px', fontFamily: 'sans-serif' }}>
        
        <header style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>🤫 사내 대나무숲 (Slido-X)</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>가입 없이 닉네임/비번만 치고 자유롭게 작성하세요.</p>
        </header>

        {/* 글쓰기 폼 */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)}
              style={{ width: '50%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <input 
              type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: '50%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
          <textarea 
            placeholder="사내 소통, 건의사항을 익명으로 남겨보세요..." value={content} onChange={(e) => setContent(e.target.value)} rows={3}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'none' }}
          />
          <button type="submit" style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            대나무숲에 털어놓기 🚀
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.map((post) => (
            <div key={post.id} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '14px' }}>{post.nickname}</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{post.createdAt ? post.createdAt.split('T')[0] : ''}</span>
              </div>
              <p style={{ margin: 0, color: '#111827', fontSize: '15px', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default App