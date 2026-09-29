/** The single piece of user-facing text this page renders. */
export const helloWorldText = 'Hello World';

/** Renders the public Hello World page as a standalone HTML document. */
export function renderHelloWorldPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${helloWorldText}</title>
  </head>
  <body>
    <main>
      <h1>${helloWorldText}</h1>
    </main>
  </body>
</html>
`;
}
