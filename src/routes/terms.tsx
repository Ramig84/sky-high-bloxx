import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/game/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Sky Bloxx" },
      { name: "description", content: "The rules for playing Sky Bloxx, virtual coins and fair play." },
      { property: "og:title", content: "Terms of Service — Sky Bloxx" },
      { property: "og:description", content: "The rules for playing Sky Bloxx, virtual coins and fair play." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="October 14, 2026">
      <p>By playing Sky Bloxx you agree to these terms.</p>
      <h2>The game</h2>
      <p>Sky Bloxx is a tower-stacking game for entertainment. It offers no real-money gambling and no prizes of monetary value.</p>
      <h2>Virtual coins and items</h2>
      <ul>
        <li>Coins, cranes and tower styles are a limited license to use in-game only. They have no cash value and cannot be redeemed, sold, traded or transferred.</li>
        <li>Coins from an unfinished level are not kept.</li>
        <li>We may adjust balances to correct errors or abuse.</li>
      </ul>
      <h2>Your account</h2>
      <p>Names must not be offensive or impersonate others. You are responsible for activity on your account. You may delete it at any time from Settings; deleted coins and items are not recoverable.</p>
      <h2>Fair play</h2>
      <p>No cheating, exploits or automation. We may remove scores or suspend accounts that break these rules.</p>
      <h2>Ads</h2>
      <p>Some features, like an extra life, may require watching a short ad. Ad breaks may appear between levels.</p>
      <h2>Disclaimer</h2>
      <p>The game is provided "as is" without warranties. To the extent permitted by law, we are not liable for lost progress or service interruptions.</p>
      <h2>Contact</h2>
      <p>
        Questions about these terms: email{" "}
        <a className="underline" href="mailto:support@moonbeacon.com">support@moonbeacon.com</a>{" "}
        or visit our studio site{" "}
        <a className="underline" href="https://moon-beacon-showcase.lovable.app" target="_blank" rel="noopener noreferrer">Moon Beacon</a>.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms; continued play means you accept the updated version.</p>
    </LegalPage>
  );
}
