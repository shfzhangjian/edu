"""Package only the offline website, teaching assets and user documentation."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
p=Path(__file__).resolve().parents[1];out=p/'downloads/九年级完整学习资料包.zip'
files=[p/n for n in ['index.html','使用说明.txt','启动学习中心.command','README.md']]
files += [f for d in ['assets','data','downloads','docs'] for f in (p/d).rglob('*') if f.is_file() and f.suffix!='.zip']
with ZipFile(out,'w',ZIP_DEFLATED) as z:
 for f in sorted(files):z.write(f,'九年级学习中心/'+str(f.relative_to(p)))
with ZipFile(out) as z:
 assert z.testzip() is None
 assert (z.getinfo('九年级学习中心/启动学习中心.command').external_attr>>16)&0o111
print(f'Packaged {len(files)} files, {out.stat().st_size/1024/1024:.2f} MiB')
