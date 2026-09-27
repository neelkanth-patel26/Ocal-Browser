with open('pdf-viewer.html', encoding='utf-8') as f:
    text = f.read()

for el_id in ['color-well-btn', 'chroma-card', 'chroma-grid', 'chroma-hex', 'file-picker-input', 'page-num', 'page-count']:
    print(el_id, text.count(f'id="{el_id}"'))
