import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from package_android import package


class AndroidPackagingTests(unittest.TestCase):
    def test_bundles_public_screens_and_media_without_intercepting_api(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            client, android = root / "client", root / "android"
            for route in ("", "privacy", "terms", "delete-account"):
                folder = client / route
                folder.mkdir(parents=True, exist_ok=True)
                (folder / "index.html").write_text("<html>Game screen</html>")
            (client / "assets").mkdir()
            (client / "assets/game.js").write_text("console.log('game');")
            java = android / "app/src/main/java/app/lovable/skyhighbloxx/MainActivity.java"
            java.parent.mkdir(parents=True)
            java.write_text("placeholder")
            class Response:
                status = 200
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def read(self): return b"abc"
            # Exercise every real pointer's destination without external downloads.
            original = json.loads
            def asset_json(text):
                result = original(text)
                if "asset_id" in result: result["size"] = 3
                return result
            with patch("package_android.urlopen", return_value=Response()), patch("package_android.json.loads", side_effect=asset_json):
                package(client, android)
            manifest = original((android / "app/src/main/assets/public/native-files.json").read_text())
            for route in ("/", "/privacy", "/terms", "/delete-account", "/assets/game.js"):
                self.assertIn(route, manifest)
            self.assertNotIn("/_serverFn", manifest)
            self.assertNotIn("/api", manifest)
            self.assertEqual(len([p for p in manifest if p.startswith("/__l5e/")]), 27)
            self.assertIn("shouldInterceptRequest", java.read_text())

    def test_retries_a_timed_out_media_download(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            client, android = root / "client", root / "android"
            for route in ("", "privacy", "terms", "delete-account"):
                folder = client / route
                folder.mkdir(parents=True, exist_ok=True)
                (folder / "index.html").write_text("<html></html>")
            java = android / "app/src/main/java/app/lovable/skyhighbloxx/MainActivity.java"
            java.parent.mkdir(parents=True)
            java.write_text("placeholder")
            class Response:
                status = 200
                def __enter__(self): return self
                def __exit__(self, *args): pass
                def read(self): return b"abc"
            seen = set()
            def flaky(request, timeout):
                # First request for every file times out, the retry succeeds.
                if request.full_url not in seen:
                    seen.add(request.full_url)
                    raise TimeoutError("The read operation timed out")
                return Response()
            original = json.loads
            def asset_json(text):
                result = original(text)
                if "asset_id" in result: result["size"] = 3
                return result
            with patch("package_android.urlopen", side_effect=flaky), \
                 patch("package_android.json.loads", side_effect=asset_json), \
                 patch("package_android.BACKOFF", 0):
                package(client, android)
            self.assertEqual(len(seen), 27)


if __name__ == "__main__":
    unittest.main()