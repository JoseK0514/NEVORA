import re, os, json, sys, glob
root = sys.argv[1]
SKIP = re.compile(r'(\.test\.|\.test-support|/__|\.d\.ts$|\.css$|/test/|\.stories\.)')
ES_CHARS = re.compile(r'[áéíóúñ¿¡ÁÉÍÓÚÑ]')
ES_WORDS = re.compile(r'\b(el|la|los|las|de|del|que|para|con|una|un|por|está|son|tu|tus|en|no|se|al|sin|más|hoy|semana|turno|turnos|hora|horas|equipo|nómina)\b')
EN_WORDS = re.compile(r'\b(the|and|your|you|this|that|with|from|for|to|of|in|on|is|are|no|not|can|will|a|an|it|be|or|at|by|as|if|all|any|each|one|who|what|when|time|shift|shifts|pay|team|week|day|today|open|save|add|edit|cancel|back|next|done|try|again|sign|view|see)\b', re.I)
# String literals and JSX text.
LIT = re.compile(r'''(?<![\w$.])(?:"((?:[^"\\\n]|\\.){2,})"|'((?:[^'\\\n]|\\.){2,})'|`((?:[^`\\]|\\.){2,}?)`)''')
JSXTXT = re.compile(r'>\s*([A-Z][^<>{}\n]{2,}?)\s*<')
def visible(s):
  s = s.strip()
  if len(s) < 3 or not re.search(r'[A-Za-záéíóúñ]{2}', s): return False
  if re.match(r'^[a-z0-9_\-./:@#?&=%]+$', s): return False          # ids, classNames, paths, keys
  if re.search(r'^(use |@/|\.\.?/|https?:|/api/|/app/|data-|aria-|c-|b-|q-|ep-|eb-|nv-)', s): return False
  if re.search(r'\b(className|import|export|function|const|return)\b', s): return False
  if re.match(r'^[a-z]+(-[a-z0-9]+)+( [a-z]+(-[a-z0-9]+)*)*$', s): return False  # "c-row c-row--b"
  if re.match(r'^[A-Z_]{2,}$', s): return False                      # CONSTANTS
  if ' ' not in s and not re.match(r'^[A-Z][a-z]+$', s): return False  # single tokens unless a capitalised word
  return True
def classify(s):
  if ES_CHARS.search(s) or len(ES_WORDS.findall(s.lower())) >= 2 and not EN_WORDS.search(s): return 'es'
  return 'en'
out = {}
for path in glob.glob(f'{root}/src/**/*.ts*', recursive=True):
  rel = os.path.relpath(path, root)
  if SKIP.search(rel): continue
  if not (rel.startswith('src/app/app/') or rel.startswith('src/components/') or rel in ('src/lib/navigation.ts', 'src/lib/finder.ts')): continue
  text = open(path, encoding='utf-8').read()
  code = re.sub(r'/\*[\s\S]*?\*/', '', text); code = re.sub(r'(^|[^:])//[^\n]*', r'\1', code)
  strings = [next(g for g in m.groups() if g is not None) for m in LIT.finditer(code)] + JSXTXT.findall(code)
  vis = [s for s in strings if visible(s)]
  en = sum(1 for s in vis if classify(s) == 'en'); es = sum(1 for s in vis if classify(s) == 'es')
  langAware = bool(re.search(r"lang\s*===?\s*['\"]es['\"]|\bes\s*\?|RECEIPT_WORDS|\[lang\]|readPortalLanguage|readAuthLang|lang=\{", code))
  out[rel] = {'en': en, 'es': es, 'langAware': langAware, 'reads': bool(re.search(r'readPortalLanguage|readAuthLang', code))}
json.dump(out, open('/tmp/claude-0/inv/files.json', 'w'), indent=0)
print(len(out), sum(v['en'] for v in out.values()), sum(v['es'] for v in out.values()))
