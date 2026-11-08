# Vellum — gerador do logótipo. © 2026 Leonardo Barreiras (Leo Barreiras).
V="M365 1372 220 1410 226 1430H720L714 1410L556 1374L694 210H670L1410 1367L1254 1410L1260 1430H1652L1646 1410L1475 1364L576 -20H540Z"
VB=(220,-20,1652,1430)  # caixa do V (unidades da fonte, 2000/em)
INK="#1C1B18"; SURF="#F2ECE1"; ELEV="#FFFDF9"; BORDER="#E4DDD0"; ACC="#AC4C2A"
D_INK="#EAE5DF"; D_ELEV="#2A2624"; D_BORDER="#3A3430"; D_ACC="#D97757"

def vpath(x, base, h, cls=None, fill=None):
    s=h/1450; tx=x-VB[0]*s
    a=f' class="{cls}"' if cls else f' fill="{fill}"'
    return f'<path{a} transform="translate({tx:.3f} {base:.3f}) scale({s:.6f} {-s:.6f})" d="{V}"/>', 1432*s

def tile(x,y,w,h,fold,r):
    # folha com canto superior direito dobrado (orelha) e os restantes cantos arredondados
    return (f"M{x+r} {y}H{x+w-fold}L{x+w} {y+fold}V{y+h-r}Q{x+w} {y+h} {x+w-r} {y+h}"
            f"H{x+r}Q{x} {y+h} {x} {y+h-r}V{y+r}Q{x} {y} {x+r} {y}Z")
def ear(x,y,w,fold,r=0):
    return f"M{x+w-fold} {y}V{y+fold-r}Q{x+w-fold} {y+fold} {x+w-fold+r} {y+fold}H{x+w}Z"

def mark(x,y,w,h,fold,r,vh,cls):
    """Folha + V + ponto. cls = (folha, orelha, V, ponto) classes."""
    vx_path, vw = vpath(0,0,vh)
    dot_r = vh*0.105
    total = vw + dot_r*2.35
    vx = x + (w-total)/2
    base = y + h/2 + vh*0.5 + h*0.035
    vp,_ = vpath(vx, base, vh, cls=cls[2])
    cx = vx + vw + dot_r*1.15; cy = base - dot_r - vh*0.008
    return (f'<path class="{cls[0]}" d="{tile(x,y,w,h,fold,r)}"/>'
            f'<path class="{cls[1]}" d="{ear(x,y,w,fold,r*0.5)}"/>' + vp +
            f'<circle class="{cls[3]}" cx="{cx:.3f}" cy="{cy:.3f}" r="{dot_r:.3f}"/>')

HDR="<!-- Vellum — © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados. -->"

# 1) favicon / ícone de separador: folha cheia em tinta, V creme (claro); inverte no escuro
fav=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">{HDR}
<style>.s{{fill:{INK}}}.e{{fill:#5B554C}}.v{{fill:{ELEV}}}.d{{fill:#E07A55}}
@media (prefers-color-scheme:dark){{.s{{fill:{SURF}}}.e{{fill:#C9BFAE}}.v{{fill:{INK}}}.d{{fill:{ACC}}}}}</style>
{mark(2,2,28,28,8,4.5,16.5,("s","e","v","d"))}
</svg>
'''
open("icon.svg","w").write(fav)
open("fav-raster.svg","w").write(fav.replace("@media (prefers-color-scheme:dark)","@media (max-width:0)"))

# 2) ícone de app (512): mesa creme com grão, folha velino elevada com sombra quente
def app(frac):
    hh=512*frac; ww=hh*0.86; x=(512-ww)/2; y=(512-hh)/2+4
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{HDR}
<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#6B5135" flood-opacity="0.14"/><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#6B5135" flood-opacity="0.12"/></filter>
<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.42 0 0 0 0 0.32 0 0 0 0 0.21 0 0 0 0.06 0"/></filter>
<style>.s{{fill:{ELEV}}}.e{{fill:{BORDER}}}.v{{fill:{INK}}}.d{{fill:{ACC}}}</style></defs>
<rect width="512" height="512" fill="{SURF}"/><rect width="512" height="512" filter="url(#g)"/>
<g filter="url(#sh)">{mark(x,y,ww,hh,hh*0.2,hh*0.045,hh*0.44,("s","e","v","d"))}</g>
</svg>'''
open("app-icon.svg","w").write(app(0.64))
open("app-maskable.svg","w").write(app(0.5))

# 3) VellumMark (UI, currentColor; o ponto usa o acento do tema)
open("ui-mark.txt","w").write(mark(3,2,18,20,5,2.2,10,("S","E","V","D")))
