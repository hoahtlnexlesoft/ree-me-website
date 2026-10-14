#!/usr/bin/env python3
"""Bake text edits into the site source.

Usage: python3 tools/sync_edits.py edits.json   (run from the repo root)
edits.json: [{"id": "...", "src": "vercel"|"preview", "page": "site:/..."|"careers/<file>[#hash]", "from": "...", "to": "..."}]
Lines in from/to are separated by "\n" (one per <br>-separated piece of the element).
Prints a JSON report: {"applied": [ids], "failed": [{"id", "reason"}], "files": [changed files]}.
"""
import json, re, sys, html, unicodedata

BUNDLE = 'assets/index-ReeCa02.js'
nfc = lambda s: unicodedata.normalize('NFC', s or '')

def lines_of(s):
    return [re.sub(r'\s+', ' ', l).strip() for l in nfc(s).split('\n')]

def file_for(page):
    if page.startswith('careers/'):
        return 'careers/' + page[len('careers/'):].split('#')[0]
    return BUNDLE

def find_js(text, line):
    """Return list of (start, end) spans of `line` in the bundle, preferring a whole template literal."""
    esc = re.escape(line).replace(r'\ ', r'\s+')
    whole = [m.span(1) for m in re.finditer(r'`(\s*' + esc + r'\s*)`', text)]
    if whole:
        return [(s, e) for s, e in whole]
    return [m.span() for m in re.finditer(esc, text)]

def find_html(text, line):
    parts = [re.escape(html.escape(w, quote=False)) for w in line.split(' ')]
    esc = r'\s+'.join(parts)
    return [m.span() for m in re.finditer(r'(?<=>)\s*' + esc + r'\s*(?=<)', text)] or [m.span() for m in re.finditer(esc, text)]

def apply(files, e):
    f = file_for(e['page'])
    if f not in files:
        try:
            files[f] = open(f, encoding='utf8').read()
        except OSError:
            return 'file not found: ' + f
    text = files[f]
    src, dst = [l for l in lines_of(e['from'])], lines_of(e['to'])
    if len(src) == 0 or not any(src):
        return 'empty original text'
    finder = find_js if f == BUNDLE else find_html
    spans = []
    for l in src:
        if not l:
            spans.append(None); continue
        hits = finder(text, l)
        if len(hits) != 1:
            return ('not found' if not hits else 'found %d times' % len(hits)) + ': ' + l[:60]
        spans.append(hits[0])
    # assign new lines to the original pieces; extra new lines go into the last piece
    real = [i for i, s in enumerate(spans) if s]
    new = {}
    for k, i in enumerate(real):
        new[i] = ' '.join(dst[k:]) if k == len(real) - 1 else (dst[k] if k < len(dst) else '')
    for i in sorted(real, key=lambda i: spans[i][0], reverse=True):
        s, en = spans[i]
        old = text[s:en]
        lead = old[:len(old) - len(old.lstrip())]; trail = old[len(old.rstrip()):]
        val = new[i]
        if f == BUNDLE:
            val = val.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
        else:
            val = html.escape(val, quote=False)
        text = text[:s] + lead + val + trail + text[en:]
    files[f] = text
    return None

def main():
    edits = json.load(open(sys.argv[1], encoding='utf8'))
    files, report = {}, {'applied': [], 'failed': [], 'files': []}
    orig = {}
    for e in edits:
        before = dict(files)
        err = apply(files, e)
        if err:
            files = before
            report['failed'].append({'id': e.get('id'), 'reason': err})
        else:
            report['applied'].append(e.get('id'))
    for f, t in files.items():
        cur = open(f, encoding='utf8').read()
        if cur != t:
            open(f, 'w', encoding='utf8').write(t)
            report['files'].append(f)
    print(json.dumps(report, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
