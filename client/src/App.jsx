import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from './api'
import { AuthProvider, useAuth } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import './App.css'

function messageFrom(error) {
  return error.response?.data?.message || error.message || 'Something went wrong'
}

function PageMessage({ error, loading }) {
  if (loading) return <p className="notice">Loading…</p>
  if (error) return <p className="notice error" role="alert">{error}</p>
  return null
}

function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="topbar">
      <Link className="brand" to="/">Gather<span>Table</span></Link>
      <nav>
        {user ? (
          <>
            {user.role === 'customer' ? <Link to="/bookings">My bookings</Link> : <Link to="/owner/restaurants">My restaurants</Link>}
            <span className="welcome">Hi, {user.name}</span>
            <button className="link-button" onClick={() => { signOut(); navigate('/') }}>Log out</button>
          </>
        ) : <><Link to="/login">Log in</Link><Link className="nav-cta" to="/register">Get started</Link></>}
      </nav>
    </header>
  )
}

function AuthPage({ mode }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer' })
  const isRegister = mode === 'register'

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post(`/auth/${isRegister ? 'register' : 'login'}`, form)
      signIn(data)
      navigate(data.user.role === 'owner' ? '/owner/restaurants' : '/')
    } catch (err) {
      setError(messageFrom(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">A better table awaits</p>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">{isRegister ? 'Find your next favorite place or bring your restaurant online.' : 'Sign in to pick up where you left off.'}</p>
        <form className="stack" onSubmit={submit}>
          {isRegister && <>
            <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </>}
          <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          {isRegister && <label>Account type<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="customer">Customer</option><option value="owner">Restaurant owner</option></select></label>}
          {error && <p className="notice error" role="alert">{error}</p>}
          <button className="button primary" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</button>
        </form>
        <p className="muted auth-switch">{isRegister ? 'Already have an account?' : 'New to GatherTable?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link></p>
      </section>
    </main>
  )
}

function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([])
  const [filters, setFilters] = useState({ cuisine: '', location: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRestaurants() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/restaurants', { params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value.trim())) })
      setRestaurants(data.restaurants)
    } catch (err) { setError(messageFrom(err)) } finally { setLoading(false) }
  }

  useEffect(() => { loadRestaurants() }, [])

  return (
    <main className="page-shell">
      <section className="hero-copy">
        <p className="eyebrow">Good food. Great company.</p>
        <h1>Make room for <em>something delicious.</em></h1>
        <p className="muted">Discover local favorites and book a table in just a few taps.</p>
      </section>
      <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); loadRestaurants() }}>
        <label>Cuisine<input placeholder="Italian, sushi…" value={filters.cuisine} onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })} /></label>
        <label>Area<input placeholder="City or neighborhood" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} /></label>
        <button className="button primary">Find a table</button>
      </form>
      <div className="section-heading"><div><p className="eyebrow">The shortlist</p><h2>Restaurants to love</h2></div><span className="muted">{restaurants.length} places</span></div>
      <PageMessage error={error} loading={loading} />
      {!loading && !error && restaurants.length === 0 && <p className="empty">No restaurants found. Try a different cuisine or area.</p>}
      <div className="restaurant-grid">
        {restaurants.map((restaurant) => <article className="restaurant-card" key={restaurant._id}>
          <Link to={`/restaurants/${restaurant._id}`} className="card-image">
            {restaurant.imageUrl ? <img src={restaurant.imageUrl} alt={restaurant.name} /> : <div className="image-placeholder">{restaurant.cuisine || 'Local favorite'}</div>}
          </Link>
          <div className="card-body"><div className="card-title"><div><p className="eyebrow">{restaurant.cuisine || 'Restaurant'}</p><h3>{restaurant.name}</h3></div><span className="rating">✦</span></div>
            <p className="muted">{restaurant.address}</p><p className="card-description">{restaurant.description || 'A welcoming spot for your next meal.'}</p>
            <Link className="text-link" to={`/restaurants/${restaurant._id}`}>Explore & book <span>→</span></Link>
          </div>
        </article>)}
      </div>
    </main>
  )
}

function timeOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const minutes = index * 30
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })
}

function RestaurantDetailPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const [restaurant, setRestaurant] = useState(null)
  const [form, setForm] = useState({ date: '', startTime: '18:00', endTime: '19:00', partySize: '2' })
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get(`/restaurants/${id}`).then(({ data }) => setRestaurant(data.restaurant)).catch((err) => setError(messageFrom(err))).finally(() => setLoading(false))
  }, [id])

  async function findTables(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setTables([])
    setChecking(true)
    try {
      const { data } = await api.get('/bookings/availability', { params: { restaurantId: id, date: form.date, startTime: form.startTime, endTime: form.endTime, partySize: form.partySize } })
      setTables(data.tables)
      if (!data.tables.length) setNotice('No tables are available for that time. Try another slot.')
    } catch (err) { setError(messageFrom(err)) } finally { setChecking(false) }
  }

  async function book(tableId) {
    if (!token || user?.role !== 'customer') {
      setNotice('Log in as a customer to book a table.')
      return
    }
    setError('')
    setNotice('')
    try {
      await api.post('/bookings', { restaurantId: id, tableId, partySize: Number(form.partySize), bookingDate: form.date, startTime: form.startTime, endTime: form.endTime })
      setNotice('Your booking request is in. Find it in My bookings.')
      setTables([])
    } catch (err) {
      setError(messageFrom(err))
      if (err.response?.status === 409) setTables((available) => available.filter((table) => table._id !== tableId))
    }
  }

  return <main className="page-shell narrow">
    <PageMessage error={error} loading={loading} />
    {restaurant && <>
      <Link className="back-link" to="/">← All restaurants</Link>
      <div className="detail-hero">
        {restaurant.imageUrl ? <img src={restaurant.imageUrl} alt={restaurant.name} /> : <div className="image-placeholder large">{restaurant.cuisine || 'Gather around'}</div>}
        <div className="detail-copy"><p className="eyebrow">{restaurant.cuisine || 'Restaurant'}</p><h1>{restaurant.name}</h1><p className="muted">{restaurant.address}</p><p>{restaurant.description}</p><p className="muted">Open {restaurant.openingTime}–{restaurant.closingTime}{restaurant.phone && ` · ${restaurant.phone}`}</p></div>
      </div>
      <section className="panel"><p className="eyebrow">Make it a date</p><h2>Find your table</h2>
        <form className="booking-fields" onSubmit={findTables}>
          <label>Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>From<select value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}>{timeOptions().map((time) => <option key={time}>{time}</option>)}</select></label>
          <label>Until<select value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}>{timeOptions().map((time) => <option key={time}>{time}</option>)}</select></label>
          <label>Guests<select value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></label>
          <button className="button primary" disabled={checking}>{checking ? 'Checking…' : 'Show available tables'}</button>
        </form>
        {notice && <p className="notice success">{notice}</p>}
        {error && <p className="notice error" role="alert">{error}</p>}
        {tables.length > 0 && <div className="available-list"><h3>Choose a table</h3>{tables.map((table) => <div className="available-table" key={table._id}><div><strong>Table {table.tableNumber}</strong><span className="muted"> Seats up to {table.capacity}</span></div><button className="button secondary" onClick={() => book(table._id)}>Book this table</button></div>)}</div>}
      </section>
    </>}
  </main>
}

function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load() {
    try { const { data } = await api.get('/bookings/my'); setBookings(data.bookings) }
    catch (err) { setError(messageFrom(err)) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  async function cancel(id) {
    setError('')
    try { await api.patch(`/bookings/${id}/cancel`); await load() }
    catch (err) { setError(messageFrom(err)) }
  }
  return <main className="page-shell"><div className="section-heading"><div><p className="eyebrow">Your plans</p><h1>My bookings</h1></div><Link className="button secondary" to="/">Find a restaurant</Link></div>
    <PageMessage error={error} loading={loading} />
    {!loading && bookings.length === 0 && <p className="empty">No bookings yet. Your next great meal is waiting.</p>}
    <div className="booking-list">{bookings.map((booking) => <article className="booking-card" key={booking._id}>
      <div className="booking-date"><strong>{booking.bookingDate}</strong><span>{booking.startTime}–{booking.endTime}</span></div>
      <div className="booking-info"><h3>{booking.restaurantId?.name || 'Restaurant'}</h3><p className="muted">{booking.tableId?.tableNumber ? `Table ${booking.tableId.tableNumber} · ` : ''}{booking.partySize} guests · {booking.restaurantId?.address}</p></div>
      <span className={`badge ${booking.status}`}>{booking.status}</span>
      {['pending', 'confirmed'].includes(booking.status) && <button className="button quiet danger-text" onClick={() => cancel(booking._id)}>Cancel</button>}
    </article>)}</div>
  </main>
}

function OwnerRestaurantsPage() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/restaurants/mine/list').then(({ data }) => setRestaurants(data.restaurants)).catch((err) => setError(messageFrom(err))).finally(() => setLoading(false)) }, [])
  return <main className="page-shell"><div className="section-heading"><div><p className="eyebrow">Your business</p><h1>My restaurants</h1><p className="muted">Manage your listing, tables, and reservations.</p></div><Link className="button primary" to="/owner/restaurants/new">+ Add restaurant</Link></div>
    <PageMessage error={error} loading={loading} />
    {!loading && restaurants.length === 0 && <p className="empty">Add your first restaurant to get started.</p>}
    <div className="restaurant-grid">{restaurants.map((restaurant) => <article className="restaurant-card owner-card" key={restaurant._id}>
      {restaurant.imageUrl ? <img className="owner-thumb" src={restaurant.imageUrl} alt={restaurant.name} /> : <div className="image-placeholder">{restaurant.cuisine || 'Your restaurant'}</div>}
      <div className="card-body"><p className="eyebrow">{restaurant.cuisine || 'Restaurant'}</p><h3>{restaurant.name}</h3><p className="muted">{restaurant.address}</p><div className="owner-actions"><Link className="button secondary" to={`/owner/restaurants/${restaurant._id}/manage`}>Manage</Link><Link className="text-link" to={`/owner/restaurants/${restaurant._id}/bookings`}>Bookings →</Link></div></div>
    </article>)}</div>
  </main>
}

const blankRestaurant = { name: '', description: '', cuisine: '', address: '', phone: '', openingTime: '10:00', closingTime: '22:00' }

function RestaurantManagePage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(blankRestaurant)
  const [tables, setTables] = useState([])
  const [tableForm, setTableForm] = useState({ tableNumber: '', capacity: 2 })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadTables() {
    if (!id) return
    try { const { data } = await api.get(`/restaurants/${id}/tables`); setTables(data.tables) }
    catch (err) { setError(messageFrom(err)) }
  }
  useEffect(() => {
    if (!id) return
    Promise.all([api.get(`/restaurants/${id}`), api.get(`/restaurants/${id}/tables`)]).then(([restaurantRes, tableRes]) => {
      setForm({ ...blankRestaurant, ...restaurantRes.data.restaurant })
      setTables(tableRes.data.tables)
    }).catch((err) => setError(messageFrom(err))).finally(() => setLoading(false))
  }, [id])

  async function saveRestaurant(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => { if (value !== undefined && value !== null) payload.append(key, value) })
      if (file) payload.append('image', file)
      if (editing) await api.put(`/restaurants/${id}`, payload)
      else await api.post('/restaurants', payload)
      setNotice('Restaurant saved.')
      if (!editing) navigate('/owner/restaurants')
    } catch (err) { setError(messageFrom(err)) } finally { setSaving(false) }
  }

  async function addTable(event) {
    event.preventDefault(); setError(''); setNotice('')
    try {
      await api.post(`/restaurants/${id}/tables`, { ...tableForm, capacity: Number(tableForm.capacity) })
      setTableForm({ tableNumber: '', capacity: 2 }); setNotice('Table added.'); await loadTables()
    } catch (err) { setError(messageFrom(err)) }
  }

  async function updateTable(table, changes) {
    setError(''); setNotice('')
    try {
      await api.put(`/tables/${table._id}`, changes)
      setNotice(`Table ${table.tableNumber} updated.`); await loadTables()
    } catch (err) { setError(messageFrom(err)) }
  }

  return <main className="page-shell narrow"><Link className="back-link" to="/owner/restaurants">← My restaurants</Link><div className="section-heading"><div><p className="eyebrow">Restaurant profile</p><h1>{editing ? 'Manage restaurant' : 'Add a restaurant'}</h1></div></div>
    <PageMessage error={error} loading={loading} />
    {!loading && <>
      <form className="panel stack" onSubmit={saveRestaurant}>
        <div className="form-grid">
          <label>Restaurant name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Cuisine<input value={form.cuisine || ''} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} placeholder="Italian, Pakistani…" /></label>
          <label className="full">Address<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>Phone<input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Description<input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Opens<input type="time" required value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} /></label>
          <label>Closes<input type="time" required value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} /></label>
          <label className="full">Restaurant image<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /><small>Optional · image files up to 2 MB</small></label>
        </div>
        {notice && <p className="notice success">{notice}</p>}
        <button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save restaurant'}</button>
      </form>
      {editing && <section className="panel table-manager"><div className="section-heading compact"><div><p className="eyebrow">Seating</p><h2>Manage tables</h2></div><Link className="text-link" to={`/owner/restaurants/${id}/bookings`}>View bookings →</Link></div>
        <form className="table-add" onSubmit={addTable}><label>Table number<input required value={tableForm.tableNumber} onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })} /></label><label>Capacity<input type="number" min="1" required value={tableForm.capacity} onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })} /></label><button className="button secondary">Add table</button></form>
        {tables.map((table) => <div className="table-row" key={table._id}><div><strong>Table {table.tableNumber}</strong><span className="muted"> · capacity {table.capacity} · {table.isActive ? 'Active' : 'Inactive'}</span></div><div className="table-controls"><input aria-label={`Capacity for table ${table.tableNumber}`} type="number" min="1" defaultValue={table.capacity} onBlur={(e) => { if (Number(e.target.value) !== table.capacity) updateTable(table, { capacity: Number(e.target.value) }) }} /><button className="button quiet" onClick={() => updateTable(table, { isActive: !table.isActive })}>{table.isActive ? 'Deactivate' : 'Activate'}</button></div></div>)}
      </section>}
    </>}
  </main>
}

function OwnerBookingsPage() {
  const { restaurantId } = useParams()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load() {
    try { const { data } = await api.get(`/bookings/restaurant/${restaurantId}`); setBookings(data.bookings) }
    catch (err) { setError(messageFrom(err)) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [restaurantId])
  async function setStatus(id, status) {
    setError('')
    try { await api.patch(`/bookings/${id}/status`, { status }); await load() }
    catch (err) { setError(messageFrom(err)) }
  }
  return <main className="page-shell"><Link className="back-link" to={`/owner/restaurants/${restaurantId}/manage`}>← Manage restaurant</Link><div className="section-heading"><div><p className="eyebrow">Reservation desk</p><h1>Restaurant bookings</h1></div></div>
    <PageMessage error={error} loading={loading} />
    {!loading && bookings.length === 0 && <p className="empty">No bookings yet.</p>}
    <div className="booking-list">{bookings.map((booking) => <article className="booking-card" key={booking._id}>
      <div className="booking-date"><strong>{booking.bookingDate}</strong><span>{booking.startTime}–{booking.endTime}</span></div>
      <div className="booking-info"><h3>{booking.customerId?.name || 'Customer'} · table {booking.tableId?.tableNumber}</h3><p className="muted">{booking.partySize} guests · {booking.customerId?.email}</p>{booking.notes && <p>{booking.notes}</p>}</div>
      <span className={`badge ${booking.status}`}>{booking.status}</span>
      {booking.status === 'pending' && <div className="owner-actions"><button className="button primary" onClick={() => setStatus(booking._id, 'confirmed')}>Confirm</button><button className="button quiet danger-text" onClick={() => setStatus(booking._id, 'rejected')}>Reject</button></div>}
    </article>)}</div>
  </main>
}

function AppRoutes() {
  const { token, user } = useAuth()
  return <BrowserRouter><Navbar /><Routes>
    <Route path="/" element={<RestaurantsPage />} />
    <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
    <Route path="/login" element={token ? <Navigate to={user?.role === 'owner' ? '/owner/restaurants' : '/'} replace /> : <AuthPage mode="login" />} />
    <Route path="/register" element={token ? <Navigate to={user?.role === 'owner' ? '/owner/restaurants' : '/'} replace /> : <AuthPage mode="register" />} />
    <Route element={<ProtectedRoute role="customer" />}><Route path="/bookings" element={<MyBookingsPage />} /></Route>
    <Route element={<ProtectedRoute role="owner" />}>
      <Route path="/owner/restaurants" element={<OwnerRestaurantsPage />} />
      <Route path="/owner/restaurants/new" element={<RestaurantManagePage />} />
      <Route path="/owner/restaurants/:id/manage" element={<RestaurantManagePage />} />
      <Route path="/owner/restaurants/:restaurantId/bookings" element={<OwnerBookingsPage />} />
    </Route>
    <Route path="*" element={<main className="page-shell"><h1>Page not found</h1><Link className="text-link" to="/">Back to restaurants</Link></main>} />
  </Routes><footer className="footer">Made for good meals and better company.</footer></BrowserRouter>
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
