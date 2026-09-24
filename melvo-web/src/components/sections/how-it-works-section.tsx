import { homeContent } from '@/content/home'

export function HowItWorksSection() {
  const { how } = homeContent

  return (
    <section className="section" id="how-it-works">
      <h2>{how.heading}</h2>
      <ol className="card-grid">
        {how.steps.map((step) => (
          <li className="card" key={step.id}>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
