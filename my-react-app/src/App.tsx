import './App.css'
import './feedSort.css'
import './forumToss.css'
import './search.css'
import './activityRefresh.css'
import { BoardPage } from './components/BoardPage'
import { useBoardController } from './hooks/useBoardController'

function App() {
  const controller = useBoardController()
  return <BoardPage controller={controller} />
}

export default App
