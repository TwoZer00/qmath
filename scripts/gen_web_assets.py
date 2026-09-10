from PIL import Image, ImageDraw
import os

BG       = (10, 10, 15)
LCD_BG   = (157, 184, 154)
LCD_TEXT = (26, 46, 26)
LCD_DIM  = (74, 107, 74)
ACCENT   = (192, 57, 43)

GLYPHS = {
    'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'A': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'P': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
    'E': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    'X': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
    'B': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
    'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    'R': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
    'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'Y': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
    'G': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    ' ': [[0,0,0,0,0]]*7,
}

def draw_text(draw, text, x, y, scale, color):
    cx = x
    for ch in text:
        g = GLYPHS.get(ch)
        if g:
            for row, bits in enumerate(g):
                for col, bit in enumerate(bits):
                    if bit:
                        draw.rectangle([
                            cx + col*scale, y + row*scale,
                            cx + col*scale + scale-1, y + row*scale + scale-1
                        ], fill=color)
        cx += (5 + 1) * scale

def text_width(text, scale):
    return len(text) * (5 + 1) * scale - scale

# favicon.png 32x32
def gen_favicon():
    size = 32
    img = Image.new('RGB', (size, size), LCD_BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, size-1, size-1], outline=LCD_DIM, width=1)
    scale = 2
    text = 'MX'
    w = text_width(text, scale)
    h = 7 * scale
    x = (size - w) // 2
    y = (size - h) // 2
    draw_text(draw, text, x, y, scale, LCD_TEXT)
    img.save('docs/favicon.png')
    print('favicon.png done')

# og.png 1200x630
def gen_og():
    W, H = 1200, 630
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # accent line top
    draw.rectangle([0, 0, W, 5], fill=ACCENT)

    # LCD panel
    px, py = 60, 60
    lw, lh = W - px*2, H - py*2
    draw.rectangle([px, py, px+lw, py+lh], fill=LCD_BG)
    draw.rectangle([px, py, px+lw, py+lh], outline=LCD_DIM, width=3)

    # scanlines
    for sy in range(py, py+lh, 6):
        draw.line([px, sy, px+lw, sy], fill=(0, 0, 0, 20))

    # MATHPEX
    scale = 12
    text = 'MATHPEX'
    w = text_width(text, scale)
    h = 7 * scale
    x = (W - w) // 2
    y = (H - h) // 2 - 28
    draw_text(draw, text, x, y, scale, LCD_TEXT)

    # subtitle
    sub_scale = 3
    sub = 'MATH  BATTLE  ROYALE'
    sw = text_width(sub, sub_scale)
    sx = (W - sw) // 2
    sy = y + h + 20
    draw_text(draw, sub, sx, sy, sub_scale, LCD_DIM)

    img.save('docs/og.png')
    print('og.png done')

os.chdir('/Users/twozer00/Documents/github/qmath')
gen_favicon()
gen_og()
