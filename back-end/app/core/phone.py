"""Utilitarios para normalizacao de telefones angolanos."""

import re


def normalizar_telefone_angola(valor: str) -> str:
    """Normaliza telefones para o formato 244XXXXXXXXX."""
    digitos = re.sub(r"\D", "", valor or "")

    if digitos.startswith("00"):
        digitos = digitos[2:]

    if len(digitos) == 9:
        return f"244{digitos}"

    if len(digitos) == 12 and digitos.startswith("244"):
        return digitos

    raise ValueError("Numero de telefone invalido. Use 9 digitos ou +244 seguido de 9 digitos.")


def parece_telefone(valor: str) -> bool:
    digitos = re.sub(r"\D", "", valor or "")
    return len(digitos) in (9, 12) or digitos.startswith("00244")


def variantes_telefone_angola(valor: str) -> list[str]:
    normalizado = normalizar_telefone_angola(valor)
    variantes = [normalizado]

    if normalizado.startswith("244"):
        variantes.append(normalizado[3:])

    return list(dict.fromkeys(variantes))
