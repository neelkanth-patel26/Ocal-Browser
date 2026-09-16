import os
from PIL import Image

def generate_store_assets():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icon_path = os.path.join(base_dir, 'icon.png')
    appx_dir = os.path.join(base_dir, 'build', 'appx')
    os.makedirs(appx_dir, exist_ok=True)

    img = Image.open(icon_path).convert('RGBA')

    # Standard assets required for electron-builder / Windows AppX packaging:
    # 1. Square44x44Logo.png (44x44)
    # 2. Square150x150Logo.png (150x150)
    # 3. Square310x310Logo.png (310x310)
    # 4. StoreLogo.png (50x50)
    # 5. Wide310x150Logo.png (310x150) - centered icon on transparent canvas
    # 6. badgeLogo.png (24x24)

    sizes = {
        'Square44x44Logo.png': (44, 44),
        'Square150x150Logo.png': (150, 150),
        'Square310x310Logo.png': (310, 310),
        'StoreLogo.png': (50, 50),
        'badgeLogo.png': (24, 24),
    }

    for filename, size in sizes.items():
        resized = img.resize(size, Image.Resampling.LANCZOS)
        out_path = os.path.join(appx_dir, filename)
        resized.save(out_path, 'PNG')
        print(f"Generated {filename} ({size[0]}x{size[1]})")

    # Wide 310x150 tile (with centered icon)
    wide = Image.new('RGBA', (310, 150), (0, 0, 0, 0))
    icon_tile = img.resize((120, 120), Image.Resampling.LANCZOS)
    wide.paste(icon_tile, ((310 - 120) // 2, (150 - 120) // 2), icon_tile)
    wide_path = os.path.join(appx_dir, 'Wide310x150Logo.png')
    wide.save(wide_path, 'PNG')
    print("Generated Wide310x150Logo.png (310x150)")

if __name__ == '__main__':
    generate_store_assets()
