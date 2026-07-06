import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>⚾ Ohtani 50-50 기념 대시보드 ⚾</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        "동경하지 맙시다. 동경해 버리면 넘어설 수 없습니다."
      </p>
      
      <div style={{ margin: '30px' }}>
        <h2>현재 홈런/도루 카운트: {count}</h2>
        <button 
          onClick={() => setCount(count + 1)}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          카운트 올리기 🚀
        </button>
      </div>
    </div>
  )
}

export default App