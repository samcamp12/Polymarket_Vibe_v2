import { Routes, Route, NavLink } from 'react-router-dom'
import WatchlistsPage    from './pages/WatchlistsPage'
import WatchlistDetail   from './pages/WatchlistDetailPage'
import AddMarketPage     from './pages/AddMarketPage'
import RulesPage         from './pages/RulesPage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="text-purple-400 font-bold text-lg tracking-wide">
          📈 PolyWatch
        </span>
        <NavLink
          to="/"
          end
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
          <Route path="/"                              element={<WatchlistsPage />} />
          <Route path="/watchlists/:id"               element={<WatchlistDetail />} />
          <Route path="/watchlists/:id/add-market"    element={<AddMarketPage />} />
          <Route path="/watchlists/:id/rules/:marketId" element={<RulesPage />} />
        </Routes>
      </main>
    </div>
  )
}
