import { t } from '../strings'

export function About() {
  return (
    <section>
      <h1>{t('about.title')}</h1>
      <p>{t('about.body')}</p>
    </section>
  )
}
