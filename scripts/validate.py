"""Validate published resources using Python's standard library."""
from pathlib import Path
import json,re
from urllib.parse import urlsplit,unquote
p=Path(__file__).resolve().parents[1]
subjects=['math','physics','chemistry','biology','astronomy','coding']
books=[json.loads((p/'data'/f'{s}.json').read_text()) for s in subjects]
chapters=[c for b in books for c in b['chapters']];ids=[c['id'] for c in chapters]
assert len(ids)==len(set(ids)), 'Duplicate chapter IDs'
counts={'chapters':len(chapters),'questions':0,'sections':0,'examples':0}
for c in chapters:
 assert len(c['sections'])>=3 and len(c['examples'])>=2 and len(c['quiz'])>=6,c['id']
 counts['questions']+=len(c['quiz']);counts['sections']+=len(c['sections']);counts['examples']+=len(c['examples'])
 for q in c['quiz']:
  if q['type']=='choice': assert len(q['options'])==4 and isinstance(q['answer'],int) and 0<=q['answer']<4
  else: assert q['answer'] and q['rubric']
merged=(p/'assets/content.js').read_text().removeprefix('window.CURRICULUM = ').strip().removesuffix(';')
assert json.loads(merged)==books,'Rebuild content.js after editing data'
for name in ['app.js','style.css','widgets.js','phys-widgets.js','chem-widgets.js']:
 assert (p/'src'/name).read_bytes()==(p/'assets'/name).read_bytes(),f'Stale asset: {name}'
for href in re.findall(r'(?:src|href)="([^"]+)"',(p/'index.html').read_text()):
 parsed=urlsplit(href)
 if parsed.scheme or not parsed.path:continue
 assert (p/unquote(parsed.path)).is_file(),href
for s in subjects[:3]:
 for kind in ['教师教学全册','学生练习全册']:
  f=p/'downloads'/f'{s}-{kind}.pdf';assert f.read_bytes().startswith(b'%PDF-'),f.name
for name in ['.nojekyll','启动学习中心.command','README.md','docs/使用指南.md','docs/部署与维护.md','docs/教材范围与来源.md','downloads/初中物理·交互课堂.html']:
 assert (p/name).exists(),name
for d in ['src','assets','scripts','docs']:
 for f in (p/d).rglob('*'):
  if f.suffix in {'.js','.py','.md','.html','.json'}:
   content=f.read_text()
   assert not re.search(r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}',content),f'Potential credential: {f}'
print('PASS:',json.dumps(counts,ensure_ascii=False))
