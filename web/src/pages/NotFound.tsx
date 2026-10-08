import { Link } from 'react-router-dom'
import { SITE_TEXT } from '../text'

/** Shown for any URL that matches no route; offers a way back to Home. */
export default function NotFound() {
  return (
    <section>
      <h1>{SITE_TEXT.notFoundTitle}</h1>
      <p>{SITE_TEXT.notFoundBody}</p>
      <Link to="/">{SITE_TEXT.notFoundHomeLink}</Link>
    </section>
  )
}
