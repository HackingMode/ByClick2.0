import os
import glob

base_dir = r'c:\Users\Uveli Afonso\Documents\GitHub\ByClick2.0\front-end\public\paineis'
count = 0
for filepath in glob.glob(base_dir + '/**/*.html', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace(
        '<div class="icon-btn"><i class="fa-regular fa-bell"></i>',
        '<div class="icon-btn" onclick="window.location.href=\'notificacoes.html\'" style="cursor:pointer;"><i class="fa-regular fa-bell"></i>'
    )
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
print(f"Updated {count} files.")
