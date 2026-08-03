import { useEffect, useState } from 'react'
import AdminApp from './admin/AdminApp'
import FrontApp from './FrontApp'

function getRoute(): 'admin' | 'front' {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash.startsWith('admin') ? 'admin' : 'front'
}

export default function App() {
  const [route, setRoute] = useState<'admin' | 'front'>(getRoute)

  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('admin-mode', route === 'admin')
    return () => document.body.classList.remove('admin-mode')
  }, [route])

  if (route === 'admin') return <AdminApp />
  return <FrontApp />
}
