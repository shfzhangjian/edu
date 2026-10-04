#!/usr/bin/env python3
"""Create six complete, print-ready booklets from the learning-center data."""
from pathlib import Path
import json
import os
import shutil
import re
import html
import math
import subprocess
from concurrent.futures import ThreadPoolExecutor

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    KeepTogether, Table, TableStyle, Flowable, CondPageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'downloads'
QA = ROOT / 'qa'
FONT = os.environ.get('EDU_CJK_FONT', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf')
POPPLER = os.environ.get('EDU_PDFTOPPM') or shutil.which('pdftoppm')
if not Path(FONT).is_file():
    raise SystemExit('请通过 EDU_CJK_FONT 指定支持中文的 TrueType 字体文件。')
if not POPPLER:
    raise SystemExit('请安装 Poppler，或通过 EDU_PDFTOPPM 指定 pdftoppm。')
pdfmetrics.registerFont(TTFont('CN', FONT))
pdfmetrics.registerFontFamily('CN', normal='CN', bold='CN', italic='CN', boldItalic='CN')
PW, PH = A4
ML, MR, MT, MB = 49, 49, 49, 45
FW, FH = PW-ML-MR, PH-MT-MB
INK = colors.HexColor('#172B3A')
MUTED = colors.HexColor('#526673')
RULE = colors.HexColor('#D7E0E3')
PALE = colors.HexColor('#F4F7F7')
SUBJECTS = {
    'math': ('数学', '#155E75', '方程与函数 / 几何与测量 / 概率与统计'),
    'physics': ('物理', '#855321', '热与能 / 电路与磁场 / 信息与能源'),
    'chemistry': ('化学', '#37644D', '物质与变化 / 实验与证据 / 化学与生活'),
}


def plain(text):
    return str(text).replace('\u2014', '-').replace('\u2013', '-').replace('\u2011', '-')


def rich(text):
    # Arial Unicode MS lacks U+1D63; render the same chemical subscript using markup.
    return html.escape(plain(text)).replace('ᵣ', '<sub>r</sub>')


def styles(accent):
    base = dict(fontName='CN', textColor=INK, wordWrap='CJK', allowWidows=0, allowOrphans=0)
    return {
        'body': ParagraphStyle('body', fontSize=10.2, leading=17.2, spaceAfter=7, **base),
        'small': ParagraphStyle('small', fontSize=8.6, leading=14, spaceAfter=5, **base),
        'note': ParagraphStyle('note', fontSize=8.6, leading=14, textColor=MUTED, fontName='CN', wordWrap='CJK', spaceAfter=6),
        'h1': ParagraphStyle('h1', fontSize=22, leading=31, spaceAfter=10, keepWithNext=True, **base),
        'h2': ParagraphStyle('h2', fontSize=13, leading=20, spaceBefore=13, spaceAfter=8, keepWithNext=True, textColor=accent, fontName='CN', wordWrap='CJK'),
        'h3': ParagraphStyle('h3', fontSize=10.8, leading=18, spaceBefore=8, spaceAfter=5, keepWithNext=True, **base),
        'formula': ParagraphStyle('formula', fontSize=11.2, leading=19, spaceAfter=5, **base),
        'question': ParagraphStyle('question', fontSize=10.5, leading=18, spaceAfter=7, keepWithNext=True, **base),
        'option': ParagraphStyle('option', fontSize=9.7, leading=16, spaceAfter=4, **base),
        'tag': ParagraphStyle('tag', fontSize=9, leading=14, textColor=accent, fontName='CN', wordWrap='CJK', spaceAfter=8),
        'toc': ParagraphStyle('toc', fontSize=10.7, leading=23, textColor=INK, fontName='CN', wordWrap='CJK', leftIndent=0, firstLineIndent=0, spaceBefore=2),
    }


class AnswerLines(Flowable):
    def __init__(self, count=4, gap=22):
        super().__init__()
        self.count, self.gap = count, gap
        self.width, self.height = FW, count*gap

    def draw(self):
        self.canv.setStrokeColor(RULE)
        self.canv.setLineWidth(.4)
        for n in range(self.count):
            y = self.height - (n+1)*self.gap + 4
            self.canv.line(0, y, self.width, y)


class Cover(Flowable):
    def __init__(self, subject, student, data, accent):
        super().__init__()
        self.width, self.height = FW, FH-1
        self.subject, self.student, self.data, self.accent = subject, student, data, accent

    def draw(self):
        c = self.canv
        name = SUBJECTS[self.subject][0]
        role = '学生练习全册' if self.student else '教师教学全册'
        c.setFillColor(self.accent)
        c.rect(0, self.height-9, 66, 5, fill=1, stroke=0)
        c.setFont('CN', 10)
        c.drawString(0, self.height-42, 'AETHER VIZ  /  九年级学习中心')
        c.setFillColor(INK)
        c.setFont('CN', 48)
        c.drawString(0, self.height-141, name)
        c.setFont('CN', 24)
        c.drawString(0, self.height-183, role)
        c.setFillColor(MUTED)
        c.setFont('CN', 10)
        c.drawString(1, self.height-221, SUBJECTS[self.subject][2])

        y = self.height-303
        ch = len(self.data['chapters'])
        qn = sum(len(v['quiz']) for v in self.data['chapters'])
        vals = [(str(ch), '完整章节'), (str(qn), '原创练习'), (str(ch), '探究活动')]
        for idx, (val, label) in enumerate(vals):
            x = idx*158
            c.setFillColor(self.accent); c.setFont('CN', 27); c.drawString(x, y, val)
            c.setFillColor(MUTED); c.setFont('CN', 9); c.drawString(x, y-24, label)
        c.setStrokeColor(RULE); c.line(0, y-47, FW, y-47)
        st = styles(self.accent)
        lines = [
            ('先观察，再推理，留下自己的解释。' if self.student else '从概念讲解到课堂探究，再到反馈与评价。'),
            ('含全章练习、实验记录表与作答空间。参考答案单独收录于教师版。' if self.student else '含教学目标、完整讲解、公式条件、例题步骤、探究活动、易错提醒和练习解析。'),
            self.data['edition'],
        ]
        y -= 88
        for tx in lines:
            p=Paragraph(rich(tx), st['body' if tx == lines[0] else 'note'])
            _, h=p.wrap(FW, 100); p.drawOn(c, 0, y-h); y-=h+13
        if self.student:
            c.setFont('CN', 10); c.setFillColor(INK)
            c.drawString(0, 96, '姓名：________________    班级：________________')
            c.drawString(0, 61, '使用日期：____________    任课教师：____________')
        else:
            c.setFont('CN', 10); c.setFillColor(INK)
            c.drawString(0, 69, '学校 / 班级：________________    任课教师：____________')
        c.setFont('CN', 8); c.setFillColor(MUTED)
        c.drawString(0, 18, 'A4 打印版  ·  原创教学辅导资料  ·  配合学习中心交互课程使用')


class BookDoc(BaseDocTemplate):
    def __init__(self, filename, subject, student, **kw):
        super().__init__(filename, pagesize=A4, leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
                         title=f'九年级{SUBJECTS[subject][0]}-'+('学生练习全册' if student else '教师教学全册'),
                         author='九年级学习中心', **kw)
        self.subject, self.student = subject, student
        self.accent = colors.HexColor(SUBJECTS[subject][1])
        self.chapter_pages = {}
        frame=Frame(ML, MB, FW, FH, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(PageTemplate(id='book', frames=[frame], onPage=self.decorate))

    def decorate(self, canvas, doc):
        if doc.page == 1:
            return
        canvas.saveState()
        canvas.setFont('CN', 8); canvas.setFillColor(MUTED)
        canvas.drawString(ML, PH-29, '九年级学习中心 / '+SUBJECTS[self.subject][0])
        canvas.drawRightString(PW-MR, PH-29, '学生练习全册' if self.student else '教师教学全册')
        canvas.setStrokeColor(RULE); canvas.setLineWidth(.45)
        canvas.line(ML, PH-37, PW-MR, PH-37)
        canvas.line(ML, 34, PW-MR, 34)
        canvas.setFont('CN', 7.8)
        canvas.drawString(ML, 21, '人教版经典目录 · 请按本校现用教材核对章节')
        canvas.setFillColor(self.accent)
        canvas.drawRightString(PW-MR, 21, str(doc.page).zfill(2))
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if hasattr(flowable, 'chapter_id'):
            key=flowable.chapter_id
            title=flowable.getPlainText()
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, level=0, closed=False)
            self.notify('TOCEntry', (0, title, self.page, key))
            self.chapter_pages[key]=self.page


def P(tx, st, kind='body'):
    return Paragraph(rich(tx), st[kind])


def heading(text, st, chapter_id=None):
    p=P(text,st,'h1')
    if chapter_id:
        p.chapter_id=chapter_id
    return p


def options(q, st):
    cells=[P(f'{chr(65+i)}. {v}',st,'option') for i,v in enumerate(q['options'])]
    # Stack long answers so no choice is cramped into a narrow column.
    if max(len(plain(v)) for v in q['options'])>24:
        return cells
    t=Table([[cells[0],cells[1]],[cells[2],cells[3]]],colWidths=[FW/2,FW/2],hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),13),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    return [t]


def record_table(activity, st, rows=4):
    headers=activity['recordHeaders']
    table=Table([[P(v,st,'small') for v in headers]]+[['']*len(headers) for _ in range(rows)],
                colWidths=[FW/len(headers)]*len(headers), rowHeights=[None]+[28]*rows, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),PALE),('GRID',(0,0),(-1,-1),.4,RULE),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,0),7),('BOTTOMPADDING',(0,0),(-1,0),5),
    ]))
    return table


def chapter_header(c, st, suffix=None, full=False):
    out=[]
    if full:
        out.append(P(c['term']+'  /  '+c['category']+'  /  '+c['periods'],st,'tag'))
        out.append(heading(c['chapter']+'  '+c['title'],st,c['id']))
    else:
        out.append(P(c['chapter']+'  '+c['title'],st,'tag'))
        out.append(heading(suffix,st))
    return out


def teacher_chapter(c, st):
    out=chapter_header(c,st,full=True)
    out.append(P(c['intro'],st))
    out.append(P('教学目标',st,'h2'))
    for i,g in enumerate(c['goals'],1): out.append(P(f'{i}. {g}',st))
    out.append(P('知识讲解',st,'h2'))
    split_knowledge = len(c['sections']) >= 6 or sum(len(s['body']) for s in c['sections']) > 960
    for n, sec in enumerate(c['sections']):
        if split_knowledge and n == math.ceil(len(c['sections'])/2):
            out.append(PageBreak())
            out += chapter_header(c,st,'知识讲解 / 续')
        out.extend([P(sec['title'],st,'h3'),P(sec['body'],st)])
    if split_knowledge:
        out.extend([P('教学笔记',st,'h3'),AnswerLines(4)])
    out.append(PageBreak())
    out+=chapter_header(c,st,'公式条件与例题')
    for f in c['formulas']:
        out.append(KeepTogether([P(f['text'],st,'formula'),P(f['note'],st,'note'),Spacer(1,4)]))
    for i,ex in enumerate(c['examples'],1):
        out.append(P(f'例题 {i}  {ex["question"]}',st,'h2'))
        for n,step in enumerate(ex['steps'],1): out.append(P(f'{n}. {step}',st))
        out.append(P('结论：'+ex['answer'],st,'tag'))
    out.append(PageBreak())
    out+=chapter_header(c,st,'课堂探究与易错提醒')
    a=c['activity']
    out.append(P(a['title'],st,'h2'))
    out.append(P('材料准备：'+a['materials'],st))
    for i,step in enumerate(a['steps'],1): out.append(P(f'{i}. {step}',st))
    out.append(P('记录建议',st,'h3')); out.append(record_table(a,st,3)); out.append(Spacer(1,9))
    out.append(P('参考结论：'+a['conclusion'],st))
    out.append(P('安全与模型边界：'+a['safety'],st,'note'))
    out.append(P('易错提醒',st,'h2'))
    for i,m in enumerate(c['mistakes'],1): out.append(P(f'{i}. {m}',st))
    out.append(PageBreak())
    out+=chapter_header(c,st,'随堂练习与解析')
    # Compact but readable answer layout prevents the sixth answer becoming an
    # almost empty continuation page. Each question and explanation stays intact.
    qs=dict(st)
    qs['body']=ParagraphStyle('quizbody',parent=st['body'],fontSize=9.7,leading=15.6,spaceAfter=5)
    qs['question']=ParagraphStyle('quizquestion',parent=st['question'],fontSize=10,leading=16.4,spaceAfter=5)
    qs['tag']=ParagraphStyle('quiztag',parent=st['tag'],fontSize=8.6,leading=13,spaceAfter=5)
    qs['note']=ParagraphStyle('quiznote',parent=st['note'],fontSize=8.3,leading=12.8,spaceAfter=4)
    qs['option']=ParagraphStyle('quizoption',parent=st['option'],fontSize=9.3,leading=15,spaceAfter=3)
    for i,q in enumerate(c['quiz'],1):
        block=[P(f'{i:02d}  '+q['question'],qs,'question')]
        if q['type']=='choice':
            block+=options(q,qs)
            ans=f'{chr(65+q["answer"])}. {q["options"][q["answer"]]}'
        else:
            ans=q['answer']
        block.append(P('参考答案：'+ans,qs,'tag'))
        block.append(P('解析：'+q['explanation'],qs))
        if q.get('rubric'):
            block.append(P('评价要点：'+'；'.join(q['rubric']),qs,'note'))
        block.append(Spacer(1,7))
        out.append(KeepTogether(block))
    return out


def student_chapter(c,st):
    out=chapter_header(c,st,full=True)
    out.append(P(c['intro'],st))
    a=c['activity']
    out.append(P('探究活动  /  '+a['title'],st,'h2'))
    out.append(P('材料准备：'+a['materials'],st))
    for i,step in enumerate(a['steps'],1): out.append(P(f'{i}. {step}',st))
    out.append(P('安全与模型边界：'+a['safety'],st,'note'))
    out.append(P('我的观察与记录',st,'h3')); out.append(record_table(a,st,4))
    out.append(P('我的结论与依据',st,'h3')); out.append(AnswerLines(3))
    out.append(PageBreak())
    out+=chapter_header(c,st,'基础练习 / 选择题')
    out.append(P('先独立选择，再在空白处写出判断依据；必要时画图或列式。',st,'note'))
    for i,q in enumerate([q for q in c['quiz'] if q['type']=='choice'],1):
        block=[P(f'{i:02d}  '+q['question']+'  （    ）',st,'question')]
        block+=options(q,st)
        block+=[AnswerLines(2,19),Spacer(1,11)]
        out.append(KeepTogether(block))
    out.append(PageBreak())
    out+=chapter_header(c,st,'表达与推理 / 简答题')
    out.append(P('写出过程、理由与必要单位。完成后检查答案是否符合题设条件。',st,'note'))
    for i,q in enumerate([q for q in c['quiz'] if q['type']=='short'],5):
        out.append(KeepTogether([P(f'{i:02d}  '+q['question'],st,'question'),AnswerLines(7,23),Spacer(1,14)]))
    out.append(P('学习自评',st,'h3'))
    out.append(P('本章我已掌握：____________________________  还想弄清：____________________________',st,'small'))
    return out


def build(subject, student):
    data=json.loads((ROOT/'data'/f'{subject}.json').read_text())
    accent=colors.HexColor(SUBJECTS[subject][1]); st=styles(accent)
    name=subject+('-学生练习全册.pdf' if student else '-教师教学全册.pdf')
    path=OUT/name
    doc=BookDoc(str(path),subject,student)
    toc=TableOfContents(); toc.levelStyles=[st['toc']]; toc.dotsMinLevel=0
    story=[Cover(subject,student,data,accent),PageBreak(),heading('目录与使用说明',st),toc,Spacer(1,15)]
    story.append(P('版本说明',st,'h2')); story.append(P(data['editionNote'],st,'small'))
    use=('每章包含探究记录、4道选择题与2道简答题。学生版不收录参考结论、答案与解析，可按章节拆分打印。活动须遵循安全提示，由教师按条件组织。' if student else '按章节使用：先确定学习目标，再开展概念讲解与例题分析，组织探究并使用练习检查理解。学生独立作答后，可用本册答案和评价要点进行反馈。')
    story.append(P(use,st,'small'))
    story.append(P('目录依据与核对入口',st,'h3'))
    for src in data.get('sources',[]):
        tx=f'<link href="{html.escape(src["url"],quote=True)}" color="{SUBJECTS[subject][1]}">{rich(src["title"])}</link>'
        story.append(Paragraph(tx,st['small']))
    for c in data['chapters']:
        story.append(PageBreak()); story+=(student_chapter(c,st) if student else teacher_chapter(c,st))
    doc.multiBuild(story)
    reader=PdfReader(str(path)); text='\n'.join(pg.extract_text() or '' for pg in reader.pages)
    if student:
        assert '参考答案：' not in text and '参考结论：' not in text and '评价要点：' not in text
    else:
        assert text.count('参考答案：')==sum(len(c['quiz']) for c in data['chapters'])
        assert text.count('参考结论：')==len(data['chapters'])
    assert all(len((p.extract_text() or '').strip())>50 for p in reader.pages)
    report={'file':str(path),'subject':subject,'student':student,'pages':len(reader.pages),'bytes':path.stat().st_size,'chapters':doc.chapter_pages,'font':'Embedded Arial Unicode MS','source':str(ROOT/'data'/f'{subject}.json')}
    print(json.dumps(report,ensure_ascii=False),flush=True)
    return report


def render(report):
    subject=report['subject']; suffix='student' if report['student'] else 'teacher'
    target=QA/f'pdf-{subject}-{suffix}';target.mkdir(exist_ok=True)
    for old in target.glob('page-*.png'):
        old.unlink()
    for old in QA.glob(f'pdf-contact-{subject}-{suffix}-*.jpg'):
        old.unlink()
    subprocess.run([POPPLER,'-r','50','-png',report['file'],str(target/'page')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    pages=sorted(target.glob('page-*.png'))
    assert len(pages)==report['pages'], (len(pages),report['pages'])
    thumb_w=248; thumb_h=351; pad=16; labelh=24; cols=4; rows=4
    font=ImageFont.truetype(FONT,13)
    sheets=[]
    for first in range(0,len(pages),cols*rows):
        block=pages[first:first+cols*rows]
        nr=math.ceil(len(block)/cols)
        img=Image.new('RGB',(cols*(thumb_w+pad)+pad,nr*(thumb_h+labelh+pad)+pad),(224,230,232))
        draw=ImageDraw.Draw(img)
        for n,p in enumerate(block):
            im=Image.open(p).convert('RGB'); im.thumbnail((thumb_w,thumb_h))
            x=pad+(n%cols)*(thumb_w+pad);y=pad+(n//cols)*(thumb_h+labelh+pad)
            img.paste(im,(x,y));draw.text((x,y+thumb_h+4),f'{subject} {suffix} / {first+n+1:02d}',fill=(35,55,66),font=font)
        sheet=QA/f'pdf-contact-{subject}-{suffix}-{first//16+1:02d}.jpg'
        img.save(sheet,quality=90);sheets.append(str(sheet))
    report['contactSheets']=sheets
    report['renderedPages']=len(pages)
    # Higher-resolution representative pages: cover, directory, a chapter beginning,
    # its activity / examples and a final page.
    picks=sorted(set([1,2,3,4,5,6,min(8,report['pages']),report['pages']]))
    for p in picks:
        subprocess.run([POPPLER,'-f',str(p),'-l',str(p),'-r','100','-singlefile','-png',report['file'],str(QA/f'pdf-detail-{subject}-{suffix}-{p:03d}')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    return report


if __name__=='__main__':
    OUT.mkdir(exist_ok=True); QA.mkdir(exist_ok=True)
    reports=[build(subject,student) for subject in SUBJECTS for student in [False,True]]
    with ThreadPoolExecutor(max_workers=3) as pool:
        reports=list(pool.map(render,reports))
    (QA/'pdf-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
    print('All six PDFs built, text-checked and fully rendered.',flush=True)
