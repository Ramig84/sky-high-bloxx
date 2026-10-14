import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/game/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Sky Bloxx" },
      { name: "description", content: "How Sky Bloxx collects, uses and deletes player data." },
      { property: "og:title", content: "Privacy Policy — Sky Bloxx" },
      { property: "og:description", content: "How Sky Bloxx collects, uses and deletes player data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="October 14, 2026">
      <p>Sky Bloxx by <strong>Moonbeacon</strong> ("we") respects your privacy. This policy explains what we collect when you play and how you can delete it.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Guests:</strong> your stars, best scores, coins and settings stay on your device. If you play Endless, your player name and score are sent to the public leaderboard.</li>
        <li><strong>Signed-in players:</strong> your Google account email and ID (for sign-in), your player name, virtual coin balance, owned cranes and tower styles, stars and best Endless score.</li>
        <li><strong>Gameplay:</strong> floors built, perfect drops and run times, used only to check rewards are fair.</li>
      </ul>
      <h2>How we use it</h2>
      <p>Only to run the game: sign-in, saving your progress across phones, showing leaderboard scores and preventing cheating. We do not sell your data.</p>
      <h2>Advertising</h2>
      <p>The game may show optional rewarded video ads and short ad breaks. If real ads are enabled, the ad provider may use device identifiers under its own privacy policy, and you can limit ad personalisation in your phone settings.</p>
      <h2>Virtual coins</h2>
      <p>Coins are virtual, have no cash value and cannot be redeemed, sold or transferred.</p>
      <h2>Service providers</h2>
      <p>We use Google for sign-in and a secure cloud hosting provider to store account data.</p>
      <h2>Data retention and deletion</h2>
      <p>Your data is kept while your account exists. You can permanently delete your account and all associated data at any time from <strong>Settings → Delete account</strong>, or see <a className="underline" href="/delete-account">how to delete your account</a>. Deletion is immediate and cannot be undone. Guests can remove their data by clearing the app's storage.</p>
      <h2>Children</h2>
      <p>The game is not directed at children under 13, and we do not knowingly collect their data.</p>
      <h2>Contact</h2>
      <p>Questions or deletion requests: contact the developer through the Google Play store listing.</p>
    </LegalPage>
  );
}
