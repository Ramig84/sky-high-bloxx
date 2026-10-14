import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/game/LegalPage";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Your Account — Sky Bloxx" },
      { name: "description", content: "How to permanently delete your Sky Bloxx account and all associated data." },
      { property: "og:title", content: "Delete Your Account — Sky Bloxx" },
      { property: "og:description", content: "How to permanently delete your Sky Bloxx account and all associated data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccount,
});

function DeleteAccount() {
  return (
    <LegalPage title="Delete Your Account" updated="October 14, 2026">
      <p>Sky Bloxx by <strong>Moonbeacon</strong> lets you permanently delete your account and all associated data at any time. Deletion is immediate and cannot be undone.</p>
      <h2>How to delete your account</h2>
      <ol>
        <li>Open Sky Bloxx and sign in with the Google account you used to play.</li>
        <li>Tap <strong>Settings</strong> on the home screen.</li>
        <li>Tap <strong>Delete account</strong>, type DELETE and confirm.</li>
      </ol>
      <p>You can also request deletion by contacting the developer through the Google Play store listing — include the email address you sign in with, and we will delete the account for you.</p>
      <h2>What is deleted</h2>
      <ul>
        <li>Your player name and profile.</li>
        <li>Your coin balance, owned cranes and tower styles, stars and best scores.</li>
        <li>Your game run history.</li>
        <li>Your sign-in identity link (Google account ID and email).</li>
      </ul>
      <h2>What is kept</h2>
      <p>Nothing tied to your account. Endless leaderboard entries show only a player name and score.</p>
      <h2>Guests</h2>
      <p>Guest players have no account. All guest data lives only on your device — clear the app's storage to remove it.</p>
    </LegalPage>
  );
}
