from pathlib import Path
import json,shutil
p=Path(__file__).resolve().parents[1]
(p/'qa').mkdir(exist_ok=True)
books=[json.loads((p/'data'/f'{s}.json').read_text()) for s in ['math','physics','chemistry','biology','astronomy','coding']]
ids=set();stats={'chapters':0,'sections':0,'examples':0,'activities':0,'choice':0,'short':0}
for b in books:
 for c in b['chapters']:
  assert c['id'] not in ids;ids.add(c['id'])
  for k in ['title','intro','goals','sections','formulas','examples','activity','mistakes','quiz','sim']:
   assert c[k],(c['id'],k)
  assert len(c['sections'])>=3 and len(c['examples'])>=2 and len(c['quiz'])>=6
  stats['chapters']+=1;stats['sections']+=len(c['sections']);stats['examples']+=len(c['examples']);stats['activities']+=1
  for q in c['quiz']:
   assert q['question'] and q['explanation'];stats[q['type']]+=1
   if q['type']=='choice': assert len(q['options'])==4 and isinstance(q['answer'],int) and q['answer'] in range(4)
   else: assert q['answer'] and q['rubric']
(p/'assets/content.js').write_text('window.CURRICULUM = '+json.dumps(books,ensure_ascii=False)+';\n')
for f in ['style.css','app.js','widgets.js','chem-widgets.js','phys-widgets.js']:
 if (p/'src'/f).exists():shutil.copy2(p/'src'/f,p/'assets'/f)
html=(p/'src/index.template.html').read_text().replace('<script src="assets/widgets.js">','<script src="assets/chem-widgets.js"></script><script src="assets/phys-widgets.js"></script><script src="assets/widgets.js">')
(p/'index.html').write_text(html)
# 既有衔接课件直接保存在 downloads，无需依赖仓库之外的文件。
(p/'qa/content-audit.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
print(json.dumps(stats,ensure_ascii=False))
