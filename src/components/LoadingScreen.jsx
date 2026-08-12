export default function LoadingScreen({ message = 'Cargando…' }) {
  return (
    <main className="loading-screen" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </main>
  )
}
