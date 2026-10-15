"""Apply the approved painted master to generated Capacitor Android resources."""
import argparse
from pathlib import Path
from PIL import Image, ImageOps

DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def generate(master: Path, android: Path):
    painting = Image.open(master).convert("RGB")
    res = android / "app/src/main/res"
    if not res.is_dir():
        raise ValueError("Generate the Android platform before applying artwork")
    background = painting.getpixel((painting.width // 2, 0))
    for density, scale in DENSITIES.items():
        target = res / f"mipmap-{density}"
        target.mkdir(parents=True, exist_ok=True)
        for name in ("ic_launcher", "ic_launcher_round"):
            ImageOps.fit(painting, (round(48 * scale),) * 2, method=Image.Resampling.LANCZOS).save(target / f"{name}.png")
        ImageOps.fit(painting, (round(108 * scale),) * 2, method=Image.Resampling.LANCZOS).save(target / "ic_launcher_foreground.png")
    # Reference our raster directly, never Capacitor's default vector foreground.
    adaptive = res / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    for name in ("ic_launcher", "ic_launcher_round"):
        (adaptive / f"{name}.xml").write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/game_icon_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
''')
    values = res / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "game_icon.xml").write_text(f'<resources><color name="game_icon_background">#{background[0]:02x}{background[1]:02x}{background[2]:02x}</color></resources>\n')
    # Replace every template splash density/orientation, preserving its dimensions.
    for splash in res.glob("drawable*/splash.png"):
        with Image.open(splash) as old:
            size = old.size
        canvas = Image.new("RGB", size, background)
        edge = max(1, round(min(size) * 0.42))
        icon = ImageOps.fit(painting, (edge, edge), method=Image.Resampling.LANCZOS)
        canvas.paste(icon, ((size[0] - edge) // 2, (size[1] - edge) // 2))
        canvas.save(splash)
    for old in ("drawable-v24/ic_launcher_foreground.xml", "drawable/ic_launcher_background.xml"):
        (res / old).unlink(missing_ok=True)
    print("Applied painted launcher icons at all five densities, adaptive icons and splash screens")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", type=Path, default=Path("src/assets/game-icon-final.jpg"))
    parser.add_argument("--android", type=Path, default=Path("android"))
    args = parser.parse_args()
    generate(args.master, args.android)