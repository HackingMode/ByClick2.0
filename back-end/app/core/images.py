"""Validated raster uploads. Client-provided MIME types never become paths."""
import base64
import binascii
from io import BytesIO
from pathlib import Path
import secrets
import warnings

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from app.core.config import BASE_DIR, settings

MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 20_000_000


def save_image(value: str, folder: str, stem: str) -> str:
    encoded = value.split(',', 1)[-1]
    if len(encoded) > (MAX_BYTES * 4 // 3 + 4):
        raise HTTPException(413, 'Imagem demasiado grande (máximo 5 MB)')
    try:
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > MAX_BYTES:
            raise HTTPException(413, 'Imagem demasiado grande')
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                if image.format not in {'JPEG', 'PNG', 'WEBP'} or image.width * image.height > MAX_PIXELS:
                    raise ValueError('Unsupported image')
                image.load()
                clean = image.convert('RGB')
    except (ValueError, binascii.Error, OSError, UnidentifiedImageError,
            Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'Imagem inválida; use JPEG, PNG ou WebP')
    root = (BASE_DIR / 'imagens').resolve()
    target = (root / folder).resolve()
    if not target.is_relative_to(root):
        raise HTTPException(422, 'Diretório inválido')
    target.mkdir(parents=True, exist_ok=True)
    filename = f'{stem}_{secrets.token_hex(8)}.jpg'
    clean.save(target / filename, 'JPEG', quality=90)
    return f'{settings.BASE_URL.rstrip("/")}/imagens/{folder}/{filename}'
