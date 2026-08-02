import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).parent
COLORS = {
    0: "#1f8f5f",
    1: "#d6a700",
    2: "#e7791b",
    3: "#d33a2c",
    4: "#8b1e1e",
}


def main() -> None:
    annotations = json.loads((ROOT / "annotations.json").read_text(encoding="utf-8"))
    font = ImageFont.load_default()
    for item in annotations:
        image = Image.open(ROOT / item["image"]).convert("RGB")
        draw = ImageDraw.Draw(image)
        for mark in item["marks"]:
            x = int(mark["x"] * image.width)
            y = int(mark["y"] * image.height)
            width = int(mark["w"] * image.width)
            height = int(mark["h"] * image.height)
            color = COLORS[mark["sev"]]
            draw.rectangle((x, y, x + width, y + height), outline=color, width=5)
            label_top = max(0, y - 24)
            draw.rounded_rectangle((x, label_top, x + 58, y), radius=4, fill=color)
            draw.text((x + 6, label_top + 5), mark["id"], fill="white", font=font)
        image.save(ROOT / item["out"])


if __name__ == "__main__":
    main()
