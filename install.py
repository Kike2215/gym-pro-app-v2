#!/usr/bin/env python3
"""Uso: python3 install.py ruta/a/index.html
Inserta <script src="gympro-fixes.js"></script> antes de </body> (si falta)."""
import sys, re
p = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(p, encoding='utf-8').read()
add = [t for t in ('<script src="gympro-fixes.js"></script>', '<script src="gympro-radio.js"></script>', '<script src="gympro-visuals.js"></script>') if t not in s]
if not add:
    print('Ya estaba instalado.')
else:
    i = s.lower().rfind('</body>')
    if i < 0: sys.exit('No encuentro </body> en ' + p)
    open(p, 'w', encoding='utf-8').write(s[:i] + ''.join('    ' + t + '\n' for t in add) + s[i:])
    print('Listo: añadidos', len(add), 'script(s) a', p)
