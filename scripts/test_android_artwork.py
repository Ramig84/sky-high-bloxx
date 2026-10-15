import tempfile
import unittest
from pathlib import Path
from PIL import Image
from android_artwork import DENSITIES, generate


class AndroidArtworkTests(unittest.TestCase):
    def test_all_launcher_sizes_use_painted_master_and_no_template_vector(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            master = Path(__file__).resolve().parents[1] / "src/assets/game-icon-final.jpg"
            res = root / "app/src/main/res"
            (res / "drawable").mkdir(parents=True)
            Image.new("RGB", (320, 480)).save(res / "drawable/splash.png")
            generate(master, root)
            for density, scale in DENSITIES.items():
                for name in ("ic_launcher", "ic_launcher_round", "ic_launcher_foreground"):
                    with Image.open(res / f"mipmap-{density}/{name}.png") as image:
                        self.assertEqual(image.size, (round((108 if name.endswith("foreground") else 48) * scale),) * 2)
                        self.assertGreater(len(image.getcolors(image.width * image.height) or []), 100)
            for name in ("ic_launcher", "ic_launcher_round"):
                xml = (res / f"mipmap-anydpi-v26/{name}.xml").read_text()
                self.assertIn('@mipmap/ic_launcher_foreground', xml)
                self.assertNotIn('@drawable/ic_launcher_foreground', xml)
            with Image.open(res / "drawable/splash.png") as splash:
                self.assertEqual(splash.size, (320, 480))
                self.assertGreater(len(splash.getcolors(320 * 480) or []), 100)


if __name__ == "__main__":
    unittest.main()