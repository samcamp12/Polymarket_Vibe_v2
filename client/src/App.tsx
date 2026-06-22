import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import HomePage           from './pages/HomePage'
import WatchlistsPage    from './pages/WatchlistsPage'
import WatchlistDetail   from './pages/WatchlistDetailPage'
import AddMarketPage     from './pages/AddMarketPage'
import RulesPage         from './pages/RulesPage'

export default function App() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <button
          onClick={() => navigate('/')}
          className="text-purple-400 font-bold text-lg tracking-wide hover:text-purple-300 transition-colors"
        >
          📈 PolyWatch
        </button>
        <NavLink
          to="/watchlists"
          className={({ isActive }) =>
            `text-sm ${isActive ? 'text-purple-300 font-semibold' : 'text-gray-400 hover:text-gray-200'}`
          }
        >
          Watchlists
        </NavLink>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/"                                       element={<HomePage />} />
          <Route path="/watchlists"                            element={<WatchlistsPage />} />
          <Route path="/watchlists/:id"                        element={<WatchlistDetail />} />
          <Route path="/watchlists/:id/add-market"             element={<AddMarketPage />} />
          <Route path="/watchlists/:id/rules/:marketId"        element={<RulesPage />} />
        </Routes>
      </main>
    </div>
  )
}
