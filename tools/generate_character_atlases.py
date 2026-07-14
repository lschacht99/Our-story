"""Generate the production Leah and Moshe PNG sprite atlases.

The game reads a 7 x 7 atlas. Each 256 x 384 cell is a transparent,
anti-aliased 2.5D character drawing. Rows are idle, rotation, walk, talk,
question, jump and interact. No SVG or PDF assets are produced.
"""
from __future__ import annotations

from pathlib import Path
import math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "atlases"
OUT.mkdir(parents=True, exist_ok=True)
CELL_W, CELL_H, COLS, ROWS, SCALE = 256, 384, 7, 7, 3

INK=(37,42,42,255); WHITE=(250,246,232,255); GOLD=(204,160,70,255)
SKIN_M=(188,128,91,255); SKIN_M_D=(145,89,63,255)
SKIN_L=(223,174,148,255); SKIN_L_D=(184,126,108,255)
HAIR=(28,24,22,255); HAIR_2=(48,35,30,255)
NAVY=(26,58,80,255); BLUE=(61,108,142,255); BLUE_H=(91,139,171,255)
GREY=(139,150,156,255); GREY_H=(180,187,191,255)
TAN=(180,143,95,255); TAN_H=(207,171,121,255)
SKIRT=(31,43,61,255); SHOE=(43,46,47,255)
SCARF=(37,61,91,255); SCARF_H=(56,85,120,255)
FLOWER=(188,116,95,255); GREEN=(88,111,80,255)


def P(point): return tuple(int(round(v*SCALE)) for v in point)

def line(draw, points, fill, width):
    pts=[P(p) for p in points]; w=max(1,int(width*SCALE))
    draw.line(pts,fill=fill,width=w,joint="curve")
    r=w/2
    for x,y in (pts[0],pts[-1]): draw.ellipse((x-r,y-r,x+r,y+r),fill=fill)

def ell(draw, box, fill, outline=None, width=1):
    draw.ellipse(tuple(int(v*SCALE) for v in box),fill=fill,outline=outline,width=max(1,int(width*SCALE)))

def poly(draw, points, fill, outline=None, width=1):
    pts=[P(p) for p in points]; draw.polygon(pts,fill=fill)
    if outline: draw.line(pts+[pts[0]],fill=outline,width=max(1,int(width*SCALE)),joint="curve")

def roundrect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(tuple(int(v*SCALE) for v in box),radius=int(radius*SCALE),fill=fill,outline=outline,width=max(1,int(width*SCALE)))


def pose(row, col):
    t=col/6; p={"bob":0,"lean":0,"jump":0,"crouch":0,"face":"front","mouth":0,
        "la":(-1,.05),"ra":(1,.05),"le":(-1.05,.75),"re":(1.05,.75),"ls":0,"rs":0}
    if row==0:
        p["bob"]=-2*math.sin(t*math.tau); p["lean"]=math.sin(t*math.tau)
    elif row==1:
        p["face"]=["front","three_r","side_r","back","side_l","three_l","front"][col]
    elif row==2:
        ph=t*math.tau; s=.72*math.sin(ph); p["bob"]=-4*abs(math.sin(ph)); p["lean"]=2
        p["ls"],p["rs"]=s,-s; p["la"]=(-1-s*.4,.12); p["ra"]=(1+s*.4,.12)
    elif row==3:
        ph=t*math.tau; p["mouth"]=col%2; p["lean"]=math.sin(ph)*1.5
        p["ra"]=(.78+.32*math.sin(ph),-.08-.32*abs(math.sin(ph))); p["re"]=(.92,.42)
    elif row==4:
        pairs=[((-.9,.15),(.55,-.7)),((-.7,-.35),(.8,-.25)),((-.8,-.55),(.8,-.55)),((-.5,-.75),(.55,-.75)),((-.95,-.25),(.95,-.25)),((-.7,-.5),(.75,-.35)),((-.9,.1),(.55,-.65))]
        p["la"],p["ra"]=pairs[col]; p["mouth"]=col in (2,3,4)
    elif row==5:
        p["jump"]=[0,12,34,55,34,12,0][col]; p["crouch"]=[9,5,0,0,0,5,9][col]
        p["la"]=(-.82,-.65 if col in (2,3,4) else -.2); p["ra"]=(.82,-.65 if col in (2,3,4) else -.2)
        p["ls"],p["rs"]=(-.35,.35) if col in (2,3,4) else (0,0)
    else:
        pairs=[((-.9,.1),(1.15,-.15)),((-.8,.15),(1.25,-.35)),((-.6,-.2),(1.25,-.55)),((-.5,-.35),(1.15,-.7)),((-.7,-.15),(.95,-.45)),((-.85,.05),(.8,-.15)),((-.9,.1),(1.1,-.25))]
        p["la"],p["ra"]=pairs[col]; p["lean"]=3+col%3
    return p


def arm(cx, sy, target, elbow, scale=.96):
    start=(cx+target[0]/max(abs(target[0]),.01)*30*scale,sy)
    end=(cx+target[0]*48*scale,sy+75*scale+target[1]*72*scale)
    mid=(cx+elbow[0]*36*scale,sy+elbow[1]*46*scale)
    return start,mid,end


def moshe(row,col):
    im=Image.new("RGBA",(CELL_W*SCALE,CELL_H*SCALE),(0,0,0,0)); d=ImageDraw.Draw(im); p=pose(row,col)
    cx=128+p["lean"]; base=344-p["jump"]; crouch=p["crouch"]; hy=82+p["bob"]+crouch*.35; sy=142+p["bob"]+crouch*.55; hip=238+p["bob"]+crouch
    ky=286+p["bob"]+crouch; ls=p["ls"]*22; rs=p["rs"]*22
    for x0,kx,foot,color in [(-22,-25+ls*.4,-32+ls,TAN),(22,25+rs*.4,32+rs,TAN_H)]:
        line(d,[(cx+x0,hip),(cx+kx,ky),(cx+foot,base-16)],INK,20); line(d,[(cx+x0,hip),(cx+kx,ky),(cx+foot,base-16)],color,14)
    ell(d,(cx-48+ls,base-25,cx-13+ls,base-10),SHOE,INK,3); ell(d,(cx+13+rs,base-25,cx+48+rs,base-10),SHOE,INK,3)
    for pts,skin,sleeve in [(arm(cx,sy,p["la"],p["le"]),SKIN_M_D,GREY),(arm(cx,sy,p["ra"],p["re"]),SKIN_M,GREY_H)]:
        line(d,pts[:2],INK,28); line(d,pts[:2],sleeve,20); line(d,pts[1:],INK,21); line(d,pts[1:],skin,14); ell(d,(pts[2][0]-10,pts[2][1]-10,pts[2][0]+10,pts[2][1]+10),skin,INK,3)
    poly(d,[(cx-38,sy-8),(cx+38,sy-8),(cx+46,hip),(cx-42,hip)],GREY,INK,4); poly(d,[(cx,sy-6),(cx+37,sy-6),(cx+43,hip),(cx+5,hip)],GREY_H)
    line(d,[(cx-40,hip-2),(cx+43,hip-2)],INK,4); roundrect(d,(cx-16,hy+38,cx+16,sy+5),10,SKIN_M,INK,3)
    face=p["face"]
    if face=="back":
        ell(d,(cx-39,hy-5,cx+39,hy+72),HAIR,INK,4); ell(d,(cx-25,hy-10,cx+25,hy+10),NAVY,INK,3)
    else:
        ell(d,(cx-43,hy+21,cx-29,hy+45),SKIN_M_D,INK,3); ell(d,(cx+29,hy+21,cx+43,hy+45),SKIN_M,INK,3); ell(d,(cx-36,hy-2,cx+36,hy+68),SKIN_M,INK,4)
        poly(d,[(cx-30,hy+45),(cx+30,hy+45),(cx+23,hy+68),(cx-22,hy+68)],SKIN_M_D)
        ell(d,(cx-38,hy-10,cx+38,hy+33),HAIR,INK,4); ell(d,(cx-31,hy+10,cx+31,hy+66),SKIN_M)
        for dx,dy,r in [(-28,7,10),(-17,0,11),(-5,-3,11),(8,-2,11),(20,1,10),(29,8,9)]: ell(d,(cx+dx-r,hy+dy-r,cx+dx+r,hy+dy+r),HAIR)
        ell(d,(cx-21,hy-15,cx+22,hy+3),NAVY,INK,3)
        shift={"three_r":5,"three_l":-5,"side_r":10,"side_l":-10}.get(face,0)
        if face.startswith("side"):
            line(d,[(cx+shift-2,hy+28),(cx+shift+7,hy+27)],HAIR,3); ell(d,(cx+shift+2,hy+28,cx+shift+6,hy+32),INK); line(d,[(cx+shift+7,hy+31),(cx+shift+13,hy+38)],SKIN_M_D,3)
        else:
            line(d,[(cx-22+shift,hy+26),(cx-7+shift,hy+24)],HAIR,4); line(d,[(cx+6+shift,hy+24),(cx+22+shift,hy+26)],HAIR,4)
            ell(d,(cx-18+shift,hy+29,cx-11+shift,hy+35),INK); ell(d,(cx+11+shift,hy+29,cx+18+shift,hy+35),INK)
            ell(d,(cx-16+shift,hy+29,cx-14+shift,hy+31),WHITE); ell(d,(cx+13+shift,hy+29,cx+15+shift,hy+31),WHITE); line(d,[(cx+shift,hy+31),(cx+3+shift,hy+40)],SKIN_M_D,3)
        poly(d,[(cx-28,hy+44),(cx-20,hy+61),(cx,hy+70),(cx+21,hy+61),(cx+29,hy+44),(cx+18,hy+50),(cx,hy+55),(cx-18,hy+50)],HAIR_2)
        line(d,[(cx-15,hy+46),(cx,hy+43),(cx+15,hy+46)],HAIR,5)
        if p["mouth"]: ell(d,(cx-8,hy+50,cx+9,hy+59),(96,43,36,255),INK,2); line(d,[(cx-5,hy+52),(cx+6,hy+52)],WHITE,2)
        else: line(d,[(cx-8,hy+53),(cx+8,hy+53)],(87,43,36,255),2)
    line(d,[(cx-23,sy+15),(cx-29,hip-20)],(195,202,205,180),3); line(d,[(cx-31,sy),(cx-38,hip-14)],GREEN,6)
    return im.resize((CELL_W,CELL_H),Image.Resampling.LANCZOS)


def leah(row,col):
    im=Image.new("RGBA",(CELL_W*SCALE,CELL_H*SCALE),(0,0,0,0)); d=ImageDraw.Draw(im); p=pose(row,col)
    cx=128+p["lean"]; base=346-p["jump"]; crouch=p["crouch"]; hy=74+p["bob"]+crouch*.35; sy=137+p["bob"]+crouch*.55; hip=223+p["bob"]+crouch
    ls=p["ls"]*17; rs=p["rs"]*17; ell(d,(cx-42+ls,base-23,cx-8+ls,base-9),SHOE,INK,3); ell(d,(cx+8+rs,base-23,cx+42+rs,base-9),SHOE,INK,3)
    for pts,skin,sleeve in [(arm(cx,sy,p["la"],p["le"]),SKIN_L_D,BLUE),(arm(cx,sy,p["ra"],p["re"]),SKIN_L,BLUE_H)]:
        line(d,pts[:2],INK,27); line(d,pts[:2],sleeve,19); mid=(pts[1][0]*.25+pts[2][0]*.75,pts[1][1]*.25+pts[2][1]*.75)
        line(d,[pts[1],mid],INK,22); line(d,[pts[1],mid],sleeve,15); line(d,[mid,pts[2]],INK,16); line(d,[mid,pts[2]],skin,10); ell(d,(pts[2][0]-9,pts[2][1]-9,pts[2][0]+9,pts[2][1]+9),skin,INK,3)
    poly(d,[(cx-33,hip-4),(cx+33,hip-4),(cx+54,base-20),(cx-55,base-20)],SKIRT,INK,4); line(d,[(cx-18,hip+8),(cx-27,base-25)],(54,68,87,255),3); line(d,[(cx+15,hip+8),(cx+26,base-25)],(16,28,43,220),3)
    poly(d,[(cx-38,sy-7),(cx+38,sy-7),(cx+36,hip+4),(cx-37,hip+4)],BLUE,INK,4); poly(d,[(cx,sy-5),(cx+36,sy-5),(cx+34,hip+2),(cx+3,hip+2)],BLUE_H)
    roundrect(d,(cx-17,sy-12,cx+17,sy+8),8,BLUE_H,INK,3); roundrect(d,(cx-14,hy+43,cx+14,sy+3),9,SKIN_L,INK,3)
    face=p["face"]
    if face=="back":
        poly(d,[(cx-37,hy+20),(cx+37,hy+20),(cx+32,hip-4),(cx-31,hip-4)],HAIR_2,INK,4); ell(d,(cx-40,hy-7,cx+40,hy+68),SCARF,INK,4)
    else:
        poly(d,[(cx-36,hy+20),(cx+36,hy+20),(cx+30,hip-2),(cx+9,hip-2),(cx+6,hy+64),(cx-5,hy+64),(cx-11,hip-2),(cx-31,hip-2)],HAIR_2,INK,4)
        ell(d,(cx-35,hy-1,cx+35,hy+69),SKIN_L,INK,4); poly(d,[(cx-28,hy+47),(cx+28,hy+47),(cx+20,hy+67),(cx-20,hy+67)],SKIN_L_D)
        ell(d,(cx-39,hy-13,cx+39,hy+35),SCARF,INK,4); poly(d,[(cx-38,hy+11),(cx-30,hy+53),(cx-18,hy+45),(cx-22,hy+14)],SCARF_H,INK,3); poly(d,[(cx+30,hy+10),(cx+42,hy+57),(cx+22,hy+48),(cx+19,hy+15)],SCARF,INK,3); poly(d,[(cx+27,hy+39),(cx+44,hy+53),(cx+35,hy+96),(cx+18,hy+66)],SCARF,INK,3)
        for dx,dy,color in [(-20,0,GOLD),(8,-2,FLOWER),(23,8,GREEN),(-29,17,FLOWER),(13,18,GOLD),(32,27,FLOWER)]: ell(d,(cx+dx-3,hy+dy-3,cx+dx+3,hy+dy+3),color)
        shift={"three_r":5,"three_l":-5,"side_r":10,"side_l":-10}.get(face,0)
        if face.startswith("side"):
            line(d,[(cx+shift-2,hy+30),(cx+shift+7,hy+29)],HAIR,3); ell(d,(cx+shift+2,hy+30,cx+shift+6,hy+34),INK); line(d,[(cx+shift+7,hy+33),(cx+shift+12,hy+40)],SKIN_L_D,3)
        else:
            line(d,[(cx-21+shift,hy+27),(cx-8+shift,hy+26)],HAIR_2,3); line(d,[(cx+7+shift,hy+26),(cx+20+shift,hy+27)],HAIR_2,3)
            ell(d,(cx-17+shift,hy+31,cx-10+shift,hy+37),INK); ell(d,(cx+10+shift,hy+31,cx+17+shift,hy+37),INK); ell(d,(cx-15+shift,hy+31,cx-13+shift,hy+33),WHITE); ell(d,(cx+12+shift,hy+31,cx+14+shift,hy+33),WHITE); line(d,[(cx+shift,hy+33),(cx+2+shift,hy+42)],SKIN_L_D,3)
        for dx in (-13,-8,8,13): ell(d,(cx+dx-1,hy+43,cx+dx+1,hy+45),(173,110,91,180))
        if p["mouth"]: ell(d,(cx-8,hy+50,cx+9,hy+60),(118,53,55,255),INK,2); line(d,[(cx-5,hy+52),(cx+6,hy+52)],WHITE,2)
        else: line(d,[(cx-9,hy+52),(cx,hy+56),(cx+9,hy+52)],(132,65,65,255),2)
    line(d,[(cx-13,sy+6),(cx,sy+20),(cx+13,sy+6)],GOLD,2); ell(d,(cx-3,sy+17,cx+3,sy+23),GOLD)
    return im.resize((CELL_W,CELL_H),Image.Resampling.LANCZOS)


def atlas(kind):
    sheet=Image.new("RGBA",(CELL_W*COLS,CELL_H*ROWS),(0,0,0,0))
    maker=leah if kind=="leah" else moshe
    for row in range(ROWS):
        for col in range(COLS): sheet.alpha_composite(maker(row,col),(col*CELL_W,row*CELL_H))
    return sheet


def patch_runtime():
    game=ROOT/"game.js"; text=game.read_text(encoding="utf-8")
    text=text.replace("const anim={idle:[1,0,.1],walk:[7,2,1.15],talk:[5,3,.9],question:[5,4,.9],jump:[5,5,.7],interact:[3,6,.8]};","const anim={idle:[1,0,.1],walk:[7,2,1.15],talk:[7,3,.9],question:[7,4,.9],jump:[7,5,.7],interact:[7,6,.8]};")
    game.write_text(text,encoding="utf-8")
    sw=ROOT/"sw.js"; cache=sw.read_text(encoding="utf-8").replace("missing-journey-png-v2","missing-journey-characters-v3")
    sw.write_text(cache,encoding="utf-8")


if __name__=="__main__":
    atlas("leah").save(OUT/"leah.png",optimize=True)
    atlas("moshe").save(OUT/"moshe.png",optimize=True)
    patch_runtime()
    print("Generated high-resolution Leah and Moshe atlases: 1792 x 2688 PNG")
