import { companyStory } from '../content/companyStory';

export function About() {
  return (
    <section aria-labelledby="about-heading">
      <h1 id="about-heading">About</h1>
      <h2>{companyStory.heading}</h2>
      {companyStory.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 32)}>{paragraph}</p>
      ))}
    </section>
  );
}
