#!/usr/bin/env python3
"""Build the complete finished-PNG art pack for the simple 2D game."""
from __future__ import annotations
import json, math, random, shutil
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[1]; PNG=ROOT/'assets/png'; W,H=1280,720
INK=(31,52,55,255); NAVY=(21,63,70,255); TERRA=(184,97,75,255); GOLD=(216,172,82,255); CREAM=(249,239,216,255); OLIVE=(100,119,91,255); WHITE=(255,250,238,255)
POSES={'idle':(0,0),'talking':(1,0),'walking':(2,0),'relief':(2,1),'thinking':(0,1),'scared':(1,1),'happy':(3,1)}
REP={'prologue':'p01-paris-apartment','ch1':'c1s1-havdalah','ch2':'c2s4-strasbourg','ch3':'c3s1-mumbai-wedding','ch4':'c4s3-kohphiphi','ch5':'c5s3-hoian','ch6':'c6s3-kyoto','ch7':'c7s1-seoul','final':'f06-ending'}
CUT={'cs01-invitation':'p01-paris-apartment','cs02-erasure':'p02-paris-airport','cs03-havdalah-rabbit':'c1s1-havdalah','cs04-route':'p03-istanbul','cs05-mumbai-arrival':'p05-mumbai-arrivals','cs06-israel-fragment':'c1s9-meashearim','cs07-wedding':'c3s1-mumbai-wedding','cs08-phiphi-question':'c4s3-kohphiphi','cs09-boarding-pass':'f01-page','cs10-final-reveal':'f06-ending'}
MOTIFS={
'p01-paris-apartment':'apartment','p02-paris-airport':'airport','p03-istanbul':'arches','p04-muscat':'stars','p05-mumbai-arrivals':'airport',
'c1s1-havdalah':'candle','c1s2-construction':'rubble','c1s3-bakery-beach':'beach','c1s4-rooftop':'skyline','c1s5-yarkon':'bridge','c1s6-kibbutz':'bear','c1s7-sarel':'warehouse','c1s8-jerusalem':'stone','c1s9-meashearim':'lanterns',
'c2s1-athens':'columns','c2s2-paris':'eiffel','c2s3-versailles':'garden','c2s4-strasbourg':'timber','c2s5-riviera':'beach',
'c3s1-mumbai-wedding':'wedding','c3s2-elephanta':'cave','c3s3-ahmedabad':'steps','c3s4-udaipur':'palace','c3s5-pushkar':'ghat','c3s6-purim-holi':'powder','c3s7-tuktuk':'tuktuk','c3s8-agra':'taj','c3s9-himalaya':'mountain',
'c4s1-bangkok':'temple','c4s2-krabi':'cliffs','c4s3-kohphiphi':'beach','c4s4-phuket':'timber','c4s5-kohsamui':'palms','c4s6-waterfall':'waterfall','c4s7-ancientcity':'ruins','c4s8-chiangmai':'lanterns',
'c5s1-hcmc':'city','c5s2-birthday':'cake','c5s3-hoian':'lanterns','c5s4-coconut':'boats','c5s5-hue':'citadel','c5s6-ninhbinh':'karst','c5s7-sapa':'terraces','c5s8-caobang':'waterfall','c5s9-cave':'cave',
'c6s1-osaka':'neon','c6s2-themepark':'wheel','c6s3-kyoto':'torii','c6s4-nara':'deer','c6s5-tokyo':'neon','c6s6-fuji':'fuji',
'c7s1-seoul':'hanok','c7s2-seoulmate':'skyline','f01-page':'desk','f02-thriftshop':'shop','f03-phiphi2':'beach','f04-proposals':'rings','f05-metapuzzle':'desk','f06-ending':'sunrise'}
PALETTES={'prologue':((157,207,222),(248,202,144),(214,174,123,255)),'ch1':((148,203,214),(245,183,124),(171,128,91,255)),'ch2':((173,211,222),(249,206,151),(179,139,105,255)),'ch3':((242,184,159),(251,213,153),(191,112,86,255)),'ch4':((116,210,218),(255,209,125),(65,151,119,255)),'ch5':((119,198,194),(245,184,105),(93,142,99,255)),'ch6':((168,207,216),(243,185,156),(86,126,103,255)),'ch7':((151,197,211),(240,172,147),(95,114,111,255)),'final':((245,184,169),(252,216,154),(173,106,94,255))}

def mkdir(p): p.mkdir(parents=True,exist_ok=True); return p
def save(im,p,colors=128):
 mkdir(p.parent)
 if im.mode=='RGBA':
  a=im.getchannel('A'); rgb=im.convert('RGB').quantize(max(8,colors-1)).convert('RGB'); rgb.putalpha(a); im=rgb
 else: im=im.convert('RGB').quantize(colors).convert('RGB')
 im.save(p,'PNG',optimize=True)
def grad(top,bottom):
 im=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(im)
 for y in range(H):
  t=y/(H-1); d.line((0,y,W,y),fill=tuple(round(top[i]+(bottom[i]-top[i])*t) for i in range(3))+(255,))
 return im
def texture(im,seed):
 r=random.Random(seed); lay=Image.new('RGBA',im.size); d=ImageDraw.Draw(lay)
 for _ in range(900):
  x=r.randrange(W); y=r.randrange(H); rr=r.choice((1,1,2,3)); d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=r.choice(((255,245,220,8),(45,35,30,4))))
 return Image.alpha_composite(im,lay.filter(ImageFilter.GaussianBlur(.6)))
def buildings(d,seed,timber=False,neon=False):
 r=random.Random(seed); x=-10
 while x<W:
  bw=r.randint(100,180); bh=r.randint(180,330); top=470-bh; c=r.choice(((231,178,120,255),(201,120,94,255),(241,207,151,255),(96,150,151,255)))
  d.rectangle((x,top,x+bw,H),fill=c,outline=INK,width=5); d.polygon(((x-8,top),(x+bw//2,top-60),(x+bw+8,top)),fill=(113,66,55,255),outline=INK)
  for wx in range(x+25,x+bw-20,50):
   for wy in range(top+45,600,70): d.rounded_rectangle((wx,wy,wx+24,wy+37),5,fill=(80,137,151,255),outline=INK,width=3)
  if timber: d.line((x,top,x+bw,H),fill=(80,50,40,255),width=7); d.line((x+bw,top,x,H),fill=(80,50,40,255),width=7)
  if neon:
   for _ in range(2):
    xx=x+r.randint(10,max(12,bw-70)); yy=top+r.randint(30,max(31,bh-70)); d.rounded_rectangle((xx,yy,xx+r.randint(35,70),yy+25),5,fill=r.choice(((232,75,104,230),(64,187,205,230),(255,202,80,230))),outline=INK,width=2)
  x+=bw-4
def water(d,y=410):
 d.rectangle((0,y,W,H),fill=(67,157,177,255))
 for i in range(24): d.line((25+(i*97)%W,y+18+(i*31)%(H-y-25),95+(i*97)%W,y+18+(i*31)%(H-y-25)),fill=(245,238,207,130),width=4)
def palms(d):
 for x in (100,1120):
  d.line((x,690,x+20,300),fill=(91,64,40,255),width=18)
  for a in range(-155,-20,25):
   q=math.radians(a); d.line((x+20,300,x+20+math.cos(q)*135,300+math.sin(q)*75),fill=(44,118,80,255),width=18)
def motif(d,kind,seed):
 r=random.Random(seed)
 if kind in {'city','timber','eiffel','hanok','neon'}:
  buildings(d,seed,kind=='timber',kind=='neon'); d.polygon(((450,H),(570,455),(710,455),(850,H)),fill=(75,79,80,255))
  if kind=='eiffel': d.polygon(((535,470),(640,115),(745,470)),fill=(56,65,69,180)); d.line((570,350,710,350),fill=(56,65,69,180),width=15)
  if kind=='hanok':
   for x in range(70,W,180): d.polygon(((x,490),(x+85,405),(x+170,490)),fill=(76,69,67,255),outline=INK)
 elif kind in {'airport','arches'}:
  d.rectangle((0,110,W,470),fill=(125,184,201,220),outline=INK,width=8)
  for x in range(40,W,190): d.line((x,110,x,470),fill=(247,237,214,255),width=12)
  d.polygon(((0,470),(W,470),(W,H),(0,H)),fill=(215,188,149,255))
  d.rounded_rectangle((470,150,810,250),20,fill=NAVY,outline=INK,width=7)
  for x in (130,1020): d.rounded_rectangle((x,530,x+75,650),12,fill=TERRA,outline=INK,width=5)
  if kind=='arches':
   for x in (280,470,660,850): d.arc((x,190,x+120,520),180,360,fill=(242,217,174,255),width=16)
 elif kind=='apartment':
  d.rectangle((0,0,W,H),fill=(219,179,126,255)); d.rectangle((80,80,720,520),fill=(128,190,207,255),outline=INK,width=12)
  for x in (295,505): d.line((x,80,x,520),fill=CREAM,width=14)
  d.line((80,300,720,300),fill=CREAM,width=14); d.polygon(((385,450),(455,160),(525,450)),fill=(64,70,72,185))
  d.rounded_rectangle((820,250,1180,650),24,fill=(242,216,177,255),outline=INK,width=7); d.rectangle((500,545,790,680),fill=(150,94,67,255),outline=INK,width=7)
 elif kind in {'beach','cliffs','palms'}:
  water(d,360); d.polygon(((0,H),(0,560),(350,460),(650,520),(950,460),(W,555),(W,H)),fill=(240,208,150,255)); palms(d)
  if kind=='cliffs': d.polygon(((0,410),(190,190),(370,410)),fill=(67,126,88,255),outline=INK); d.polygon(((900,410),(1110,160),(W,410)),fill=(58,116,82,255),outline=INK)
 elif kind in {'mountain','fuji','karst'}:
  d.polygon(((0,470),(210,220),(410,470),(620,160),(820,470),(1050,250),(W,470),(W,H),(0,H)),fill=(83,121,126,255))
  d.polygon(((0,540),(260,330),(480,540),(700,300),(930,540),(1120,350),(W,540),(W,H),(0,H)),fill=(111,145,126,255))
  if kind=='fuji': d.polygon(((300,520),(640,70),(980,520)),fill=(87,116,131,255),outline=INK); d.polygon(((520,230),(640,70),(770,235),(700,210),(650,245),(600,205)),fill=WHITE)
  if kind=='karst': water(d,440)
 elif kind in {'cave'}:
  d.rectangle((0,0,W,H),fill=(52,69,69,255)); d.ellipse((-100,-180,W+100,H+260),outline=(134,119,91,255),width=180); d.ellipse((260,100,1020,780),fill=(38,80,77,255),outline=(168,147,108,255),width=20)
 elif kind in {'stone','ruins','citadel','ghat'}:
  buildings(d,seed); d.polygon(((420,H),(560,440),(720,440),(860,H)),fill=(190,161,124,255))
 elif kind=='candle':
  d.rectangle((0,0,W,H),fill=(43,63,78,255)); d.rectangle((250,450,1030,700),fill=(133,81,57,255),outline=INK,width=7); d.rectangle((580,320,625,510),fill=(239,215,158,255),outline=INK,width=5); d.polygon(((602,245),(570,335),(637,335)),fill=GOLD,outline=INK)
 elif kind=='stars':
  d.rectangle((0,0,W,H),fill=(43,61,82,255))
  for _ in range(70):
   x=r.randrange(60,W-60); y=r.randrange(30,420); rr=r.choice((2,3,4)); d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=(255,225,135,255))
  d.polygon(((0,470),(W,470),(W,H),(0,H)),fill=(207,177,139,255))
 elif kind in {'skyline'}:
  buildings(d,seed); d.rectangle((0,570,W,H),fill=(108,84,71,255)); d.rounded_rectangle((470,500,810,650),18,fill=(240,214,172,255),outline=INK,width=6)
 elif kind=='bridge':
  water(d,480); d.line((180,530,410,400,680,520,930,390,1130,505),fill=(108,74,49,255),width=38); d.line((180,492,410,362,680,482,930,352,1130,467),fill=INK,width=10)
 elif kind=='bear':
  buildings(d,seed); d.ellipse((810,300,1120,660),fill=(156,96,62,255),outline=INK,width=8); d.ellipse((850,235,960,350),fill=(156,96,62,255),outline=INK,width=6); d.ellipse((980,235,1090,350),fill=(156,96,62,255),outline=INK,width=6); d.ellipse((880,300,1050,470),fill=(214,163,111,255),outline=INK,width=7)
 elif kind in {'warehouse','shop'}:
  d.rectangle((0,100,W,H),fill=(194,171,139,255))
  for x in range(50,W,240):
   d.rectangle((x,120,x+190,650),fill=(111,75,52,255),outline=INK,width=7)
   for y in range(200,620,105): d.line((x,y,x+190,y),fill=(238,214,170,255),width=10)
 elif kind=='columns':
  for x in range(280,980,120): d.rectangle((x,220,x+65,610),fill=(240,229,201,255),outline=INK,width=5); d.rectangle((x-18,195,x+83,235),fill=(240,229,201,255),outline=INK,width=5)
  d.polygon(((230,195),(1010,195),(930,105),(310,105)),fill=(225,202,166,255),outline=INK)
 elif kind=='garden':
  d.rectangle((350,180,930,510),fill=(241,211,151,255),outline=INK,width=7); d.polygon(((0,H),(500,480),(780,480),(W,H)),fill=(195,173,125,255))
  for x in (90,220,1060,1190): d.ellipse((x-70,270,x+70,610),fill=(67,130,75,255),outline=INK,width=5)
 elif kind=='wedding':
  d.rectangle((140,90,1140,660),fill=(249,222,178,255),outline=INK,width=8)
  for x in range(210,1100,160): d.arc((x,190,x+120,530),180,360,fill=TERRA,width=15); d.line((x,350,x,620),fill=TERRA,width=15); d.line((x+120,350,x+120,620),fill=TERRA,width=15)
  for x in range(170,1120,70): d.ellipse((x,130,x+18,148),fill=TERRA); d.ellipse((x+18,130,x+36,148),fill=GOLD)
 elif kind=='steps':
  for i in range(7): d.rectangle((i*80,180+i*55,W-i*80,H),outline=(132,89,65,255),width=28)
 elif kind=='palace':
  water(d,390); d.rectangle((300,190,980,500),fill=(246,223,190,255),outline=INK,width=7); d.ellipse((520,65,760,300),fill=(246,223,190,255),outline=INK,width=6)
 elif kind=='powder':
  buildings(d,seed)
  for _ in range(55):
   x=r.randrange(40,W-40); y=r.randrange(100,620); rr=r.randrange(15,70); d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=r.choice(((235,66,118,85),(255,183,52,95),(73,174,201,85),(85,175,99,85))))
 elif kind=='tuktuk':
  buildings(d,seed); d.polygon(((430,590),(500,420),(780,420),(850,590)),fill=(248,178,48,255),outline=INK); d.rectangle((485,500,795,650),fill=(56,132,100,255),outline=INK,width=7); d.ellipse((490,610,590,710),fill=INK); d.ellipse((700,610,800,710),fill=INK)
 elif kind=='taj':
  d.rectangle((350,270,930,610),fill=(245,234,213,255),outline=INK,width=6); d.ellipse((490,75,790,380),fill=(245,234,213,255),outline=INK,width=6)
  for x in (270,910): d.rectangle((x,170,x+100,610),fill=(245,234,213,255),outline=INK,width=6); d.ellipse((x-10,100,x+110,220),fill=(245,234,213,255),outline=INK,width=5)
 elif kind=='temple':
  water(d,500)
  for x in (210,490,770,1050): d.polygon(((x,480),(x+80,220),(x+160,480)),fill=GOLD,outline=INK); d.polygon(((x+30,285),(x+80,160),(x+130,285)),fill=TERRA,outline=INK)
 elif kind=='waterfall':
  d.polygon(((0,470),(210,220),(410,470),(620,160),(820,470),(1050,250),(W,470),(W,H),(0,H)),fill=(57,125,92,255)); d.polygon(((460,170),(820,170),(760,H),(520,H)),fill=(219,241,229,255))
  for x in range(500,780,45): d.line((x,210,x-20,H),fill=(94,184,198,180),width=20)
 elif kind=='lanterns':
  buildings(d,seed)
  for _ in range(45):
   x=r.randrange(40,W-40); y=r.randrange(70,440); rr=r.randrange(7,15); d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=(255,178,64,240)); d.line((x,y+rr,x,y+rr+18),fill=(87,52,40,180),width=2)
 elif kind=='cake':
  d.rounded_rectangle((150,110,1130,650),50,fill=(250,230,197,255),outline=INK,width=7); d.ellipse((500,380,780,660),fill=(222,139,101,255),outline=INK,width=7)
  for x in range(100,W,110): d.ellipse((x,70,x+55,130),fill=r.choice((TERRA,GOLD,OLIVE,(91,156,178,255))),outline=INK,width=3)
 elif kind=='boats':
  water(d,360); palms(d)
  for x in (400,650,870): d.ellipse((x,520,x+160,650),fill=(135,79,50,255),outline=INK,width=6); d.ellipse((x+20,535,x+140,615),fill=(210,161,91,255),outline=INK,width=4)
 elif kind=='terraces':
  for i in range(9):
   y=250+i*55; d.polygon(((0,y),(W,y-80),(W,y+30),(0,y+110)),fill=(69+4*i,130+4*i,78+3*i,255),outline=(42,99,64,255))
 elif kind=='wheel':
  d.ellipse((130,170,480,520),outline=TERRA,width=22)
  for a in range(0,360,30): q=math.radians(a); d.line((305,345,305+math.cos(q)*175,345+math.sin(q)*175),fill=INK,width=4)
  d.arc((560,130,1160,650),180,355,fill=(229,124,55,255),width=28)
 elif kind=='torii':
  for i in range(8):
   x=180+i*110; y=90+i*40; d.rectangle((x,y,x+24,650),fill=(179,58,48,255),outline=INK,width=4); d.rectangle((x+110,y,x+134,650),fill=(179,58,48,255),outline=INK,width=4); d.rectangle((x-20,y,x+154,y+30),fill=(179,58,48,255),outline=INK,width=4)
 elif kind=='deer':
  d.rectangle((0,500,W,H),fill=(91,145,84,255))
  for x in (180,530,880): d.ellipse((x,430,x+180,620),fill=(173,117,76,255),outline=INK,width=5); d.ellipse((x+110,370,x+220,490),fill=(173,117,76,255),outline=INK,width=5)
 elif kind in {'desk'}:
  d.rectangle((0,0,W,H),fill=(68,68,72,255)); d.rectangle((140,80,1140,620),fill=(120,79,58,255),outline=INK,width=8); d.polygon(((330,210),(930,180),(950,450),(310,470)),fill=(250,239,210,255),outline=INK)
  for _ in range(17): x=r.randrange(350,900); y=r.randrange(220,420); d.line((x,y,x+r.randrange(30,100),y+r.randrange(-20,20)),fill=r.choice((TERRA,NAVY,GOLD,OLIVE)),width=5)
 elif kind=='rings':
  water(d,390); d.polygon(((0,H),(0,560),(420,460),(760,510),(W,450),(W,H)),fill=(240,209,154,255)); d.ellipse((530,230,680,380),outline=GOLD,width=22); d.ellipse((620,230,770,380),outline=GOLD,width=22)
 elif kind=='sunrise':
  water(d,410); d.ellipse((500,90,780,370),fill=(255,210,111,230)); d.rectangle((0,570,W,H),fill=(239,205,149,255))
  for x in range(140,1150,100): d.ellipse((x,510,x+26,536),fill=TERRA); d.line((x+13,535,x+13,580),fill=OLIVE,width=5)
 elif kind=='rubble':
  buildings(d,seed); d.polygon(((0,H),(0,590),(190,490),(430,620),(700,450),(930,610),(W,520),(W,H)),fill=(128,113,96,255),outline=INK)

def background(scene_id,chapter):
 seed=sum(map(ord,scene_id))*31337; top,bottom,ground=PALETTES.get(chapter,PALETTES['prologue']); im=grad(top,bottom); d=ImageDraw.Draw(im,'RGBA')
 for i in range(6):
  x=(seed//(i+3)+i*211)%W; y=45+(seed//(i+7))%170; d.ellipse((x-65,y-30,x+80,y+35),fill=(255,250,235,150))
 d.rectangle((0,470,W,H),fill=ground); motif(d,MOTIFS.get(scene_id,'city'),seed); return texture(im,seed)
def clear_edge(cell):
 im=cell.convert('RGBA'); w,h=im.size; p=im.load(); seen=bytearray(w*h); q=deque()
 def bg(x,y): r,g,b,a=p[x,y]; return a<18 or (r>205 and g>205 and b>205 and max(r,g,b)-min(r,g,b)<26)
 for x in range(w):
  for y in (0,h-1):
   if bg(x,y): q.append((x,y))
 for y in range(h):
  for x in (0,w-1):
   if bg(x,y): q.append((x,y))
 while q:
  x,y=q.popleft(); i=y*w+x
  if seen[i] or not bg(x,y): continue
  seen[i]=1; r,g,b,a=p[x,y]; p[x,y]=(r,g,b,0)
  if x:q.append((x-1,y))
  if x+1<w:q.append((x+1,y))
  if y:q.append((x,y-1))
  if y+1<h:q.append((x,y+1))
 return im
def normalize(cell,size=(320,480)):
 im=clear_edge(cell); box=im.getchannel('A').point(lambda p:255 if p>20 else 0).getbbox()
 if not box:return Image.new('RGBA',size)
 im=im.crop(box); k=min(size[0]*.92/im.width,size[1]*.94/im.height); im=im.resize((int(im.width*k),int(im.height*k)),Image.Resampling.LANCZOS); out=Image.new('RGBA',size); out.alpha_composite(im,((size[0]-im.width)//2,size[1]-im.height-4)); return out
def characters():
 for name in ('leah','moshe'):
  sheet=Image.open(PNG/'characters'/f'{name}-atlas.png').convert('RGBA'); cw,ch=sheet.width//4,sheet.height//2; made={}
  for pose,(c,r) in POSES.items():
   made[pose]=normalize(sheet.crop((c*cw,r*ch,(c+1)*cw,(r+1)*ch))); save(made[pose],PNG/'characters'/name/f'{pose}.png',96)
  idle=made['idle']; box=idle.getchannel('A').getbbox() or (0,0,idle.width,idle.height); x0,y0,x1,y1=box; crop=idle.crop((x0,y0,x1,min(y1,y0+int((y1-y0)*.58)))); crop.thumbnail((450,500),Image.Resampling.LANCZOS); out=Image.new('RGBA',(512,512)); out.alpha_composite(crop,((512-crop.width)//2,512-crop.height)); save(out,PNG/'portraits'/f'{name}.png',96)
def icon(kind,size=128):
 im=Image.new('RGBA',(size,size)); d=ImageDraw.Draw(im,'RGBA'); s=size/128; o=lambda v:round(v*s); lw=max(4,round(8*s))
 d.ellipse((o(8),o(8),o(120),o(120)),fill=CREAM,outline=NAVY,width=lw)
 if kind in {'question','clue'}:
  if kind=='question': d.arc((o(37),o(27),o(90),o(82)),190,520,fill=NAVY,width=lw); d.ellipse((o(57),o(94),o(71),o(108)),fill=NAVY)
  else:d.line((o(64),o(28),o(64),o(83)),fill=TERRA,width=lw+2); d.ellipse((o(56),o(95),o(72),o(111)),fill=TERRA)
 elif kind=='completed': d.line((o(28),o(66),o(53),o(91),o(100),o(35)),fill=OLIVE,width=lw+4,joint='curve')
 elif kind=='locked': d.rounded_rectangle((o(34),o(53),o(94),o(103)),8,fill=GOLD,outline=NAVY,width=lw); d.arc((o(42),o(20),o(86),o(70)),180,360,fill=NAVY,width=lw)
 elif kind=='observe': d.ellipse((o(29),o(29),o(79),o(79)),outline=NAVY,width=lw); d.line((o(75),o(75),o(102),o(102)),fill=TERRA,width=lw)
 elif kind=='anomaly': d.polygon(((o(64),o(18)),(o(72),o(52)),(o(108),o(64)),(o(72),o(75)),(o(64),o(110)),(o(53),o(75)),(o(20),o(64)),(o(53),o(52))),fill=GOLD,outline=NAVY)
 elif kind in {'rabbit'}: d.ellipse((o(35),o(48),o(93),o(104)),fill=WHITE,outline=NAVY,width=lw//2); d.ellipse((o(38),o(15),o(58),o(65)),fill=WHITE,outline=NAVY,width=lw//2); d.ellipse((o(70),o(15),o(90),o(65)),fill=WHITE,outline=NAVY,width=lw//2)
 elif kind=='hamsa':
  d.ellipse((o(43),o(40),o(85),o(100)),fill=CREAM,outline=NAVY,width=lw)
  for x in (36,48,60,72,84): d.rounded_rectangle((o(x),o(10),o(x+15),o(65)),8,fill=CREAM,outline=NAVY,width=lw)
  d.ellipse((o(52),o(55),o(76),o(75)),fill=WHITE,outline=TERRA,width=lw//2)
 elif kind=='map': d.polygon(((o(12),o(28)),(o(45),o(16)),(o(78),o(30)),(o(114),o(17)),(o(114),o(98)),(o(78),o(111)),(o(45),o(97)),(o(12),o(110))),fill=(239,220,174,255),outline=NAVY); d.line((o(45),o(17),o(45),o(97)),fill=NAVY,width=lw//2); d.line((o(78),o(30),o(78),o(111)),fill=NAVY,width=lw//2)
 elif kind=='passport': d.rounded_rectangle((o(27),o(18),o(101),o(110)),9,fill=(232,205,151,255),outline=NAVY,width=lw); d.line((o(45),o(20),o(45),o(108)),fill=NAVY,width=lw//2)
 elif kind=='notebook': d.rounded_rectangle((o(29),o(17),o(106),o(111)),8,fill=(244,226,185,255),outline=NAVY,width=lw); [d.line((o(50),o(y),o(91),o(y)),fill=TERRA,width=lw//2) for y in (42,60,78)]
 elif kind=='inventory': d.rounded_rectangle((o(22),o(43),o(106),o(111)),12,fill=(156,100,67,255),outline=NAVY,width=lw); d.arc((o(42),o(14),o(86),o(66)),180,360,fill=NAVY,width=lw)
 elif kind=='cutscene': d.rounded_rectangle((o(17),o(25),o(111),o(101)),9,fill=(239,222,185,255),outline=NAVY,width=lw); d.polygon(((o(50),o(44)),(o(50),o(82)),(o(83),o(63))),fill=TERRA,outline=NAVY)
 elif kind=='settings': d.ellipse((o(29),o(29),o(99),o(99)),fill=(235,211,165,255),outline=NAVY,width=lw); d.ellipse((o(49),o(49),o(79),o(79)),fill=WHITE,outline=TERRA,width=lw//2)
 elif kind=='swap': d.line((o(18),o(42),o(98),o(42)),fill=NAVY,width=lw); d.polygon(((o(98),o(42)),(o(78),o(27)),(o(78),o(57))),fill=NAVY); d.line((o(110),o(84),o(30),o(84)),fill=TERRA,width=lw); d.polygon(((o(30),o(84)),(o(50),o(69)),(o(50),o(99))),fill=TERRA)
 else:d.rectangle((o(35),o(28),o(93),o(100)),fill=(222,188,125,255),outline=NAVY,width=lw)
 return im
def item(kind):
 if kind in {'hamsa','rabbit','route-map'}:return icon('map' if kind=='route-map' else kind,256)
 im=Image.new('RGBA',(256,256)); d=ImageDraw.Draw(im,'RGBA'); lw=10
 if kind=='invitation':d.rectangle((32,52,224,194),fill=(249,235,203,255),outline=INK,width=lw); d.line((32,52,128,135,224,52),fill=TERRA,width=5)
 elif kind=='suitcase':d.rounded_rectangle((42,70,214,220),20,fill=TERRA,outline=INK,width=lw); d.arc((86,20,170,100),180,360,fill=INK,width=lw)
 elif kind=='boarding-pass':d.rounded_rectangle((25,64,231,190),15,fill=(245,226,188,255),outline=INK,width=lw); d.line((155,68,155,186),fill=TERRA,width=5)
 elif kind=='camera':d.rounded_rectangle((35,75,221,205),22,fill=NAVY,outline=INK,width=lw); d.ellipse((87,96,174,183),fill=(174,211,218,255),outline=INK,width=lw)
 elif kind=='havdalah-candle':d.rectangle((105,75,151,225),fill=(238,215,164,255),outline=INK,width=lw); d.polygon(((128,25),(102,82),(154,82)),fill=GOLD,outline=INK)
 return im
def npc(kind):
 im=Image.new('RGBA',(512,512)); d=ImageDraw.Draw(im,'RGBA'); skin=(176,112,74,255) if kind in {'sharon','guide'} else (219,164,123,255); cloth={'sharon':TERRA,'leora':OLIVE,'guide':NAVY,'stranger':(77,66,91,255)}[kind]
 d.ellipse((118,65,394,350),fill=skin,outline=INK,width=12); d.ellipse((95,20,415,230),fill=(43,42,39,255),outline=INK,width=12); d.ellipse((164,185,194,215),fill=INK); d.ellipse((318,185,348,215),fill=INK); d.arc((210,220,305,290),15,165,fill=INK,width=9); d.polygon(((80,512),(135,330),(377,330),(432,512)),fill=cloth,outline=INK)
 return im
def ui():
 for f,k in {'app-icon':'hamsa','icon-passport':'passport','icon-map':'map','icon-notebook':'notebook','icon-inventory':'inventory','icon-cutscene':'cutscene','icon-settings':'settings','icon-swap':'swap'}.items():save(icon(k,256 if f=='app-icon' else 128),PNG/'ui'/f'{f}.png',64)
 for k in ('question','clue','rabbit','item','observe','anomaly','completed','locked'):save(icon(k),PNG/'ui/hotspots'/f'{k}.png',64)
 for k in ('hamsa','rabbit','invitation','suitcase','boarding-pass','camera','route-map','havdalah-candle'):save(item(k),PNG/'items'/f'{k}.png',64)
 for f,k in {'eye':'observe','gear':'settings','compass':'map','key':'locked','hands':'completed'}.items():save(icon(k,160),PNG/'ui'/f'seal-{f}.png',64)
 save(icon('rabbit',256),PNG/'collectibles/rabbit-mark.png',64)
 for n in ('sharon','leora','guide','stranger'):save(npc(n),PNG/'portraits'/f'{n}.png',96)
def finish(bg):
 for ch,sid in REP.items():
  im=bg[sid].copy(); d=ImageDraw.Draw(im,'RGBA'); d.rounded_rectangle((22,22,1258,698),28,outline=WHITE,width=18); d.rounded_rectangle((42,42,1238,678),20,outline=NAVY,width=5); save(im,PNG/'ui/chapter-cards'/f'{ch}.png')
  st=Image.new('RGBA',(512,512)); sd=ImageDraw.Draw(st,'RGBA'); sd.ellipse((38,38,474,474),fill=(249,235,203,180),outline=TERRA,width=26); sd.ellipse((80,80,432,432),outline=NAVY,width=12); st.alpha_composite(icon('hamsa' if ch in {'prologue','final'} else 'map',240),(136,136)); save(st,PNG/'stamps'/f'{ch}.png',64)
 for cid,sid in CUT.items():
  im=Image.alpha_composite(bg[sid],Image.new('RGBA',(W,H),(18,49,54,35))); save(im,PNG/'cutscenes/backgrounds'/f'{cid}.png'); save(im.resize((480,270),Image.Resampling.LANCZOS),PNG/'cutscenes/thumbnails'/f'{cid}.png',96)
 glow=Image.new('RGBA',(512,512)); gd=ImageDraw.Draw(glow,'RGBA')
 for rr,a in ((220,18),(175,28),(125,45),(70,75)):gd.ellipse((256-rr,256-rr,256+rr,256+rr),fill=(255,210,99,a))
 save(glow,PNG/'cutscenes/layers/glow.png',64)
 for a,b in [('boarding-pass','ticket'),('rabbit','rabbit'),('havdalah-candle','candle'),('camera','photo'),('hamsa','hamsa')]:mkdir((PNG/'cutscenes/layers')); shutil.copyfile(PNG/'items'/f'{a}.png',PNG/'cutscenes/layers'/f'{b}.png')
 title=bg['p01-paris-apartment'].copy()
 for n,x in [('leah',70),('moshe',900)]:
  c=Image.open(PNG/'characters'/n/'happy.png').convert('RGBA'); c.thumbnail((300,520),Image.Resampling.LANCZOS); title.alpha_composite(c,(x,170))
 save(Image.alpha_composite(title,Image.new('RGBA',(W,H),(10,38,42,45))),PNG/'ui/title-key-art.png'); load=Image.new('RGBA',(240,360)); load.alpha_composite(icon('hamsa',190),(25,80)); load.alpha_composite(icon('rabbit',90),(140,230)); save(load,PNG/'ui/loading.png',64)
def clean():
 for ext in ('*.svg','*.webp','*.pdf'):
  for p in (ROOT/'assets').rglob(ext):p.unlink()
def main():
 clean(); characters(); ui(); scenes=json.loads((ROOT/'data/scenes.json').read_text())['scenes']; bg={}
 for sid,m in scenes.items():
  ch=m.get('chapterId') or ('prologue' if sid.startswith('p') else 'final' if sid.startswith('f') else sid.split('s',1)[0])
  bg[sid]=background(sid,ch); save(bg[sid],PNG/'backgrounds'/f'{sid}.png')
 finish(bg)
 for p in PNG.rglob('*.png'):
  with Image.open(p) as im:im.verify()
 print('Generated and validated',sum(1 for _ in PNG.rglob('*.png')),'PNG assets')
if __name__=='__main__':main()
