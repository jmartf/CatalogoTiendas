import { Link } from 'react-router-dom'

export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">Error 404</p><h1>Esta página no existe</h1><Link className="button button-primary" to="/dashboard">Volver al inicio</Link></main>
}
