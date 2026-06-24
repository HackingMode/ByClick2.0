import os
import glob

base_dir = r'c:\Users\Uveli Afonso\Documents\GitHub\ByClick2.0\front-end\public\paineis\painel_vendedor'
count = 0
for filepath in glob.glob(base_dir + '/**/*.html', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace(
        '<a href="#" class="nav-item"><i class="fa-solid fa-clipboard-list"></i> Pedidos</a>',
        '<a href="pedidos.html" class="nav-item"><i class="fa-solid fa-clipboard-list"></i> Pedidos</a>'
    )
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
print(f"Updated {count} files in painel_vendedor.")
