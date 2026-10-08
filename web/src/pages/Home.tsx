import { Link } from 'react-router-dom'
import { content } from '../content'
import { routes } from '../routes'

export function Home() {
  return (
    <section className="hero">
      <h1>{content.home.headline}</h1>
      <p className="hero__summary">{content.home.summary}</p>
      <Link className="hero__cta" to={routes.features}>
        {content.home.featuresLinkLabel}
      </Link>
    </section>
  )
}
