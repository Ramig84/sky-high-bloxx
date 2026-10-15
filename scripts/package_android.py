"""Assemble client build + CDN media into Android assets, without moving server code."""
import json
import mimetypes
import shutil
from pathlib import Path
from urllib.request import Request, urlopen

# The media CDN rejects Python's default "Python-urllib/3.x" user agent with 403.
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# Resolve project paths from this script so the packager works from any folder.
ROOT = Path(__file__).resolve().parents[1]
MAIN_ACTIVITY = Path(__file__).resolve().parent / "android/MainActivity.java"
from concurrent.futures import ThreadPoolExecutor

ORIGIN = "https://sky-high-bloxx.lovable.app"


def package(client=None, android=Path("android")):
    if client is None:
        # Local builds emit dist/client; CI (Nitro preset) emits .output/public.
        for candidate in (ROOT / "dist/client", ROOT / ".output/public"):
            if (candidate / "index.html").is_file():
                client = candidate
                break
        else:
            client = ROOT / "dist/client"
    if not (client / "index.html").is_file():
        raise RuntimeError("Client prerender index.html missing; cannot ship an online-only wrapper")
    target = android / "app/src/main/assets/public"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(client, target)

    def download(pointer):
        asset = json.loads(pointer.read_text())
        relative = asset["url"].lstrip("/")
        if ".." in Path(relative).parts:
            raise RuntimeError("Unsafe media path")
        output = target / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(Request(ORIGIN + asset["url"], headers={"User-Agent": USER_AGENT}), timeout=60) as response:
            data = response.read()
            if response.status != 200 or not data:
                raise RuntimeError(f"Media download failed: {pointer.name}")
            if len(data) != asset["size"]:
                raise RuntimeError(f"Media size mismatch: {pointer.name}")
        output.write_bytes(data)
        return len(data)

    pointers = list((ROOT / "src/assets").rglob("*.asset.json"))
    with ThreadPoolExecutor(max_workers=6) as pool:
        total = sum(pool.map(download, pointers))
    manifest = {}
    for file in target.rglob("*"):
        if not file.is_file():
            continue
        relative = file.relative_to(target).as_posix()
        mime = mimetypes.guess_type(relative)[0] or "application/octet-stream"
        entry = {"file": relative, "mime": mime}
        manifest["/" + relative] = entry
        if relative.endswith("index.html"):
            route = "/" + relative.removesuffix("index.html").rstrip("/")
            manifest[route] = entry
            manifest[route.rstrip("/") + "/"] = entry
    for route in ("/", "/privacy", "/terms", "/delete-account"):
        if route not in manifest:
            raise RuntimeError(f"Missing packaged screen: {route}")
    (target / "native-files.json").write_text(json.dumps(manifest, sort_keys=True))
    java = android / "app/src/main/java/app/lovable/skyhighbloxx/MainActivity.java"
    if not java.is_file():
        raise RuntimeError("Generated Android package path is unexpected")
    shutil.copyfile(MAIN_ACTIVITY, java)
    print(f"Packaged {len(manifest)} URLs including {len(pointers)} CDN files ({total:,} bytes); APIs remain online")


if __name__ == "__main__":
    package()