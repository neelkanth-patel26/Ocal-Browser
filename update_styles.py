import re
import os

def update_pdf_viewer():
    path = r"d:\Brower\pdf-viewer.html"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update fonts and :root variables
    content = content.replace(
        '<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;700&display=swap" rel="stylesheet">',
        """<style>
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-400-normal.css');
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-700-normal.css');
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/geist-mono@latest/latin-400-normal.css');
    </style>"""
    )
    
    # Replace border-radius 0px
    content = re.sub(r'border-radius:\s*0px\s*!important;?', 'border-radius: var(--radius);', content)
    content = re.sub(r'border-radius:\s*0px;?', 'border-radius: var(--radius);', content)
    
    # Set global border radius to var(--radius) instead of 8px
    content = content.replace('border-radius: 8px;', 'border-radius: var(--radius);')

    # Update toolbar to be glass
    content = content.replace(
        'background: var(--toolbar-bg);',
        'background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px);'
    )
    content = content.replace(
        'border: 1px solid var(--toolbar-border);',
        'border: 1px solid var(--glass-border, #252525);'
    )
    
    # Sidebar glass
    content = content.replace(
        'background: var(--surface);',
        'background: rgba(255, 255, 255, 0.02);'
    )
    # the backdrop filter for sidebar is var(--panel-blur) which we can set to blur(20px)
    content = content.replace('--panel-blur: none;', '--panel-blur: blur(20px);')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def update_file_manager_css():
    path = r"d:\Brower\file-manager.css"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace border-radius 0px
    content = re.sub(r'border-radius:\s*0px\s*!important;?', 'border-radius: var(--radius);', content)
    content = re.sub(r'border-radius:\s*0px;?', 'border-radius: var(--radius);', content)

    # Make .glass panel styling match home
    content = content.replace(
        'background: var(--glass);',
        'background: rgba(255, 255, 255, 0.02);'
    )
    content = content.replace('--panel-blur: none;', '--panel-blur: blur(20px);')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    update_pdf_viewer()
    update_file_manager_css()
    print("Updates complete.")
