import { homeContent } from '@/content/home'

export function ValueSection() {
  const { value } = homeContent

  return (
    <section className="section" id="value">
      <h2>{value.heading}</h2>
      <ul className="card-grid">
        {value.items.map((item) => (
          <li className="card" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
