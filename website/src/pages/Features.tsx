import { capabilities } from '../content/capabilities';

export function Features() {
  return (
    <section aria-labelledby="features-heading">
      <h1 id="features-heading">Features</h1>
      <p>Everything the product does, in one list.</p>
      <ul aria-labelledby="features-heading">
        {capabilities.map((capability) => (
          <li key={capability.id}>
            <h2>{capability.name}</h2>
            <p>{capability.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
