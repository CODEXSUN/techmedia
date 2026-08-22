from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, ImageDraw


MOBILE_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_DIR = MOBILE_DIR.parents[1]
LOGO_PATH = REPOSITORY_DIR / "src/platform/web/public/logo/logo.svg"
ANDROID_RES = MOBILE_DIR / "android/app/src/main/res"
IOS_ASSETS = MOBILE_DIR / "ios/App/App/Assets.xcassets"
BACKGROUND = "#f8fafc"


def main() -> None:
    logo = read_logo()
    generate_android_icons(logo)
    generate_android_splashes(logo)
    generate_ios_assets(logo)


def read_logo() -> tuple[tuple[float, float, float, float], list[list[tuple[float, float]]]]:
    root = ElementTree.parse(LOGO_PATH).getroot()
    view_box = tuple(float(value) for value in root.attrib["viewBox"].split())
    polygons = []
    for polygon in root.iter("{http://www.w3.org/2000/svg}polygon"):
        points = []
        for point in polygon.attrib["points"].split():
            x, y = point.split(",")
            points.append((float(x), float(y)))
        polygons.append(points)
    return view_box, polygons


def generate_android_icons(logo) -> None:
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in densities.items():
        directory = ANDROID_RES / f"mipmap-{density}"
        render_square(directory / "ic_launcher.png", size, logo, 0.56)
        render_square(directory / "ic_launcher_round.png", size, logo, 0.50, round_background=True)
        render_square(directory / "ic_launcher_foreground.png", round(size * 2.25), logo, 0.48, transparent=True)


def generate_android_splashes(logo) -> None:
    for path in ANDROID_RES.glob("drawable*/splash.png"):
        with Image.open(path) as current:
            render_splash(path, current.size, logo)


def generate_ios_assets(logo) -> None:
    icon = IOS_ASSETS / "AppIcon.appiconset/AppIcon-512@2x.png"
    render_square(icon, 1024, logo, 0.56)
    splash_set = IOS_ASSETS / "Splash.imageset"
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        render_splash(splash_set / name, (2732, 2732), logo)


def render_square(path, size, logo, logo_scale, transparent=False, round_background=False) -> None:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else BACKGROUND)
    if round_background:
        ImageDraw.Draw(image).ellipse((0, 0, size - 1, size - 1), fill=BACKGROUND)
    draw_logo(image, logo, round(size * logo_scale))
    image.convert("RGBA" if transparent else "RGB").save(path)


def render_splash(path, size, logo) -> None:
    image = Image.new("RGB", size, BACKGROUND)
    draw_logo(image, logo, round(min(size) * 0.16))
    image.save(path)


def draw_logo(image, logo, target_width) -> None:
    (origin_x, origin_y, source_width, source_height), polygons = logo
    scale = target_width / source_width
    target_height = source_height * scale
    offset_x = (image.width - target_width) / 2
    offset_y = (image.height - target_height) / 2
    transformed = [
        [((x - origin_x) * scale + offset_x, (y - origin_y) * scale + offset_y) for x, y in polygon]
        for polygon in polygons
    ]
    draw = ImageDraw.Draw(image)
    for polygon in transformed:
        draw.polygon(polygon, fill="#662c90")


if __name__ == "__main__":
    main()
