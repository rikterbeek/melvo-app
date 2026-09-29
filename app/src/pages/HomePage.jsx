export default function HomePage() {
  return (
    <div className="page">
      <header className="page__header">
        <h1>Home</h1>
      </header>

      <main className="page__main">
        <p>Welcome to the site.</p>
      </main>

      <footer className="page__footer">
        <p>&copy; {new Date().getFullYear()} Melvo Labs</p>
      </footer>
    </div>
  )
}
