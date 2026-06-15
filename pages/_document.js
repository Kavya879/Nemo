// Custom _document — minimal, no external imports. Prevents Next.js from
// generating a default _document that might conflict with native package chunks.
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
