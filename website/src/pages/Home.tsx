import { t } from '../strings'

export function Home() {
  return (
    <section>
      <h1>{t('home.title')}</h1>
      <p>{t('home.body')}</p>
    </section>
  )
}
