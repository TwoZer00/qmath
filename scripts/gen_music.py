#!/usr/bin/env python3
"""
Generates 3 additive music layers — same BPM, same length, meant to play simultaneously.
  sfx_music_low.wav  — foundation: kick + snare + melody + bass
  sfx_music_mid.wav  — adds: syncopated kicks + 16th hihats + counter melody
  sfx_music_high.wav — adds: dense kicks + clap + 32nd hihats + dissonant top melody

Intensity mixing (all 3 always playing):
  ratio > 0.66  → low=1.0, mid=0.0, high=0.0
  ratio > 0.33  → low=1.0, mid=1.0, high=0.0
  ratio ≤ 0.33  → low=1.0, mid=1.0, high=1.0

Run: python3 scripts/gen_music.py
"""
import wave, struct, math, os, random

SAMPLE_RATE  = 44100
ASSETS       = os.path.join(os.path.dirname(__file__), '../app/assets')
BPM          = 128
BARS         = 8
rng          = random.Random(42)

NOTES = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99,
}

# ── helpers ───────────────────────────────────────────────────────────────────

def mix(buf, samples, offset, vol_l=1.0, vol_r=1.0):
    for i, s in enumerate(samples):
        idx = offset + i
        if 0 <= idx < len(buf):
            buf[idx][0] += s * vol_l
            buf[idx][1] += s * vol_r

def reverb(samples, room=0.08, damp=0.6):
    delay  = int(SAMPLE_RATE * 0.03)
    delay2 = int(SAMPLE_RATE * 0.05)
    out = list(samples)
    for i in range(delay,  len(out)): out[i] += samples[i - delay]  * room * (1 - damp)
    for i in range(delay2, len(out)): out[i] += samples[i - delay2] * room * 0.5 * (1 - damp)
    return out

# ── sound generators ──────────────────────────────────────────────────────────

def beep(freq, duration_ms, volume=0.45):
    n     = int(SAMPLE_RATE * duration_ms / 1000)
    fade  = int(SAMPLE_RATE * 0.008)
    click = int(SAMPLE_RATE * 0.002)
    out   = []
    for i in range(n):
        t         = i / SAMPLE_RATE
        env       = min(i, n - i, fade) / max(fade, 1)
        transient = rng.uniform(-1, 1) * math.exp(-i / max(click, 1)) * 0.15
        tone      = 0.7 * math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(2 * math.pi * freq * 2 * t)
        out.append(volume * (env * tone + transient))
    return reverb(out)

def bass_note(freq, duration_ms, volume=0.5):
    n  = int(SAMPLE_RATE * duration_ms / 1000)
    fi = int(SAMPLE_RATE * 0.01)
    fo = int(SAMPLE_RATE * 0.08)
    out = []
    for i in range(n):
        t   = i / SAMPLE_RATE
        env = min(i / max(fi, 1), (n - i) / max(fo, 1), 1.0)
        out.append(volume * env * math.tanh(math.sin(2 * math.pi * freq * t) * 1.5) * 0.67)
    return out

def kick(pitch=75, amp_decay=0.08, pitch_decay=0.04):
    n     = int(SAMPLE_RATE * 0.15)
    click = int(SAMPLE_RATE * 0.004)
    out   = []
    for i in range(n):
        t    = i / SAMPLE_RATE
        freq = pitch * math.exp(-t / pitch_decay)
        body = 0.85 * math.exp(-t / amp_decay) * math.sin(2 * math.pi * freq * t)
        ck   = rng.uniform(-1, 1) * math.exp(-i / max(click, 1)) * 0.4
        out.append(body + ck)
    return out

def snare(body=0.35, decay=0.04):
    n = int(SAMPLE_RATE * 0.10)
    return [0.55 * math.exp(-i / SAMPLE_RATE / decay) *
            (body * math.sin(2 * math.pi * 180 * i / SAMPLE_RATE) + (1 - body) * rng.uniform(-1, 1))
            for i in range(n)]

def rimshot():
    n = int(SAMPLE_RATE * 0.04)
    return [0.6 * math.exp(-i / SAMPLE_RATE / 0.008) *
            (0.5 * math.sin(2 * math.pi * 400 * i / SAMPLE_RATE) + 0.5 * rng.uniform(-1, 1))
            for i in range(n)]

def hihat(open=False, vol=0.28):
    dur   = 0.055 if open else 0.016
    decay = 0.022 if open else 0.006
    n     = int(SAMPLE_RATE * dur)
    return [vol * math.exp(-i / (SAMPLE_RATE * decay)) * rng.uniform(-1, 1) for i in range(n)]

def clap(vol=0.5):
    n = int(SAMPLE_RATE * 0.055)
    out = []
    for i in range(n):
        t   = i / SAMPLE_RATE
        amp = math.exp(-t / 0.012) + 0.3 * math.exp(-(t - 0.008) / 0.018) * (t > 0.008)
        out.append(vol * amp * rng.uniform(-1, 1))
    return out

# ── beat layers ───────────────────────────────────────────────────────────────

def beat_foundation(buf, beat, total_beats):
    """Low layer: kick 1+3, snare 2+4, 8th hihat"""
    kick_s  = kick(pitch=65, amp_decay=0.10)
    snare_s = snare(body=0.45, decay=0.05)
    hh_s    = hihat(vol=0.22)
    hh_o    = hihat(open=True, vol=0.28)
    steps   = int(total_beats * 2)
    for s in range(steps):
        pos   = int(s * beat / 2)
        s_bar = s % 8
        if s_bar == 0: mix(buf, kick_s,  pos, 0.9, 0.9)
        if s_bar == 4: mix(buf, kick_s,  pos, 0.75, 0.75)
        if s_bar == 2: mix(buf, snare_s, pos, 0.8, 0.8)
        if s_bar == 6: mix(buf, snare_s, pos, 0.8, 0.8)
        if s_bar == 7: mix(buf, hh_o,    pos, 0.35, 0.45)
        else:          mix(buf, hh_s,    pos, 0.25, 0.3)

def beat_mid_layer(buf, beat, total_beats):
    """Mid layer: syncopated kick hits + 16th hihats (adds groove on top of foundation)"""
    kick_s = kick(pitch=75, amp_decay=0.07)
    hh_s   = hihat(vol=0.20)
    SWING  = 0.06
    steps  = int(total_beats * 4)
    for s in range(steps):
        swing_offset = int(SWING * beat / 4) if s % 2 == 1 else 0
        pos   = int(s * beat / 4) + swing_offset
        s_bar = s % 16
        # syncopated kicks only — don't double the foundation kicks
        if s_bar == 10: mix(buf, kick_s, pos, 0.55, 0.55)
        if s_bar == 14: mix(buf, kick_s, pos, 0.45, 0.45)
        # 16th hihats fill the gaps between foundation 8ths
        if s_bar % 2 == 1:
            vol = 0.22 if s_bar % 4 == 3 else 0.14
            mix(buf, hh_s, pos, vol * 0.85, vol * 1.15)

def beat_high_layer(buf, beat, total_beats):
    """High layer: dense ghost kicks + clap + 32nd hihat rolls (adds panic)"""
    kick_s  = kick(pitch=90, amp_decay=0.05, pitch_decay=0.03)
    clap_s  = clap(vol=0.4)
    rim_s   = rimshot()
    hh_s    = hihat(vol=0.22)
    steps   = int(total_beats * 4)
    for s in range(steps):
        pos   = int(s * beat / 4)
        s_bar = s % 16
        # ghost kicks on off-beats
        if s_bar in (3, 11): mix(buf, kick_s, pos, 0.5, 0.5)
        if s_bar in (6, 14): mix(buf, kick_s, pos, 0.4, 0.4)
        # clap + rimshot layered on 2 and 4
        if s_bar in (4, 12):
            mix(buf, clap_s, pos, 0.5, 0.5)
            mix(buf, rim_s,  pos, 0.4, 0.4)
        # 32nd hihat rolls — 2 per 16th slot
        half = int(beat / 8)
        for r in range(2):
            rvol = (0.28 if s_bar % 4 == 0 else 0.16) - r * 0.05
            mix(buf, hh_s, pos + r * half, rvol * 0.8, rvol * 1.2)

# ── melody layers ─────────────────────────────────────────────────────────────

def place_melody(buf, beat, total_beats):
    """Foundation melody — E minor pentatonic, relaxed phrasing"""
    pattern = [
        (0.0,'E4',80), (0.5,'G4',80), (1.0,'A4',80), (1.5,'C5',120),
        (2.0,'A4',80), (2.5,'G4',80), (3.0,'E4',80), (3.5,'D4',120),
        (4.0,'E4',80), (4.5,'A4',80), (5.0,'C5',80), (5.5,'E5',160),
        (6.0,'C5',80), (6.5,'A4',80), (7.0,'G4',80), (7.5,'E4',100),
        (8.0,'G4',80), (8.5,'A4',80), (9.0,'C5',80), (9.5,'E5',120),
        (10.0,'C5',80),(10.5,'A4',80),(11.0,'G4',80),(11.5,'E4',120),
        (12.0,'G4',80),(12.5,'C5',80),(13.0,'E5',80),(13.5,'G5',160),
        (14.0,'E5',80),(14.5,'C5',80),(15.0,'A4',80),(15.5,'E4',100),
    ]
    for start_beat, note, dur_ms in pattern:
        if start_beat < total_beats:
            mix(buf, beep(NOTES[note], dur_ms), int(start_beat * beat), 1.1, 0.7)

def place_counter_melody(buf, beat, total_beats):
    """Mid layer counter melody — sparse answering phrases, panned right"""
    pattern = [
        (2.0,'C5',55),(2.5,'B4',55),(3.0,'A4',55),
        (6.0,'E5',55),(6.5,'D5',55),(7.0,'C5',55),
        (10.0,'C5',55),(10.5,'B4',55),(11.0,'A4',55),
        (14.0,'E5',55),(14.5,'D5',55),(15.0,'C5',55),
    ]
    for start_beat, note, dur_ms in pattern:
        if start_beat < total_beats:
            mix(buf, beep(NOTES[note], dur_ms, volume=0.28), int(start_beat * beat), 0.4, 1.0)

def place_dissonant_melody(buf, beat, total_beats):
    """High layer — staccato E4-F4 minor 2nd hammer, adds tension"""
    for b in range(int(total_beats)):
        for sub, note in [(0.0,'E4'),(0.25,'F4'),(0.5,'E4'),(0.75,'F4')]:
            if b + sub < total_beats:
                mix(buf, beep(NOTES[note], 50, volume=0.22), int((b + sub) * beat), 0.9, 0.9)

def place_bass(buf, beat, total_beats):
    sequence = [
        (0.0,'E3',1.8),(1.75,'D3',0.3),
        (2.0,'E3',1.8),(3.75,'F3',0.3),
        (4.0,'A3',1.8),(5.75,'B3',0.3),
        (6.0,'A3',1.8),(7.75,'G3',0.3),
        (8.0,'G3',1.8),(9.75,'A3',0.3),
        (10.0,'G3',1.8),(11.75,'D3',0.3),
        (12.0,'C3',1.8),(13.75,'D3',0.3),
        (14.0,'E3',1.8),
    ]
    for start_beat, note, dur_beats in sequence:
        if start_beat >= total_beats: continue
        dur_ms = int(beat * dur_beats / SAMPLE_RATE * 1000)
        mix(buf, bass_note(NOTES[note], dur_ms, volume=0.5), int(start_beat * beat), 0.9, 0.9)

# ── render ────────────────────────────────────────────────────────────────────

def render(beat_fns, melody_fns, filename, master=0.82):
    rng.seed(42)
    beat        = int(SAMPLE_RATE * 60 / BPM)
    total_beats = BARS * 4
    bar_samp    = beat * 4
    total_samp  = bar_samp * BARS
    buf         = [[0.0, 0.0] for _ in range(total_samp)]

    for fn in beat_fns:   fn(buf, beat, total_beats)
    for fn in melody_fns: fn(buf, beat, total_beats)

    # linear crossfade: blend tail into head so loop is seamless
    CROSS = int(SAMPLE_RATE * 0.06)
    for i in range(CROSS):
        t = i / CROSS
        for ch in range(2):
            buf[i][ch] = buf[i][ch] * t + buf[total_samp - CROSS + i][ch] * (1 - t)

    frames = []
    for l, r in buf:
        frames += [int(math.tanh(l * master) * 32767), int(math.tanh(r * master) * 32767)]

    path = os.path.join(ASSETS, filename)
    with wave.open(path, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SAMPLE_RATE)
        w.writeframes(struct.pack(f'<{len(frames)}h', *frames))
    print(f'Generated: {path}  ({len(buf)/SAMPLE_RATE:.3f}s @ {BPM}bpm)')

# low  — foundation only
render([beat_foundation],  [place_melody, place_bass],             'sfx_music_low.wav',  master=0.75)
# mid  — additive groove layer
render([beat_mid_layer],   [place_counter_melody],                 'sfx_music_mid.wav',  master=0.70)
# high — additive panic layer
render([beat_high_layer],  [place_dissonant_melody],               'sfx_music_high.wav', master=0.65)

# ── stinger ───────────────────────────────────────────────────────────────────

def gen_stinger():
    rng.seed(42)
    dur = int(SAMPLE_RATE * 2.2)
    buf = [[0.0, 0.0] for _ in range(dur)]

    # ascending arpeggio C4 → E4 → G4 → C5
    for t_sec, note, dur_ms in [(0.00,'C4',90),(0.08,'E4',90),(0.16,'G4',90),(0.26,'C5',160)]:
        mix(buf, beep(NOTES[note], dur_ms, volume=0.55), int(t_sec * SAMPLE_RATE), 0.9, 0.9)

    # resolution chord C5 + E5 + G5
    chord_t = int(0.45 * SAMPLE_RATE)
    for note, vl, vr in [('C5',1.0,0.7),('E5',0.8,1.0),('G5',0.9,0.9)]:
        mix(buf, beep(NOTES[note], 500, volume=0.38), chord_t, vl, vr)
    mix(buf, bass_note(130.81, 600, volume=0.6), chord_t, 0.9, 0.9)
    mix(buf, snare(body=0.4, decay=0.05), chord_t, 0.7, 0.7)

    fade_start = int(SAMPLE_RATE * 1.4)
    for i in range(dur - fade_start):
        t = 1 - i / (dur - fade_start)
        buf[fade_start + i][0] *= t
        buf[fade_start + i][1] *= t

    frames = []
    for l, r in buf:
        frames += [int(math.tanh(l * 0.88) * 32767), int(math.tanh(r * 0.88) * 32767)]
    path = os.path.join(ASSETS, 'sfx_music_stinger.wav')
    with wave.open(path, 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SAMPLE_RATE)
        w.writeframes(struct.pack(f'<{len(frames)}h', *frames))
    print(f'Generated: {path}  ({dur/SAMPLE_RATE:.2f}s, stinger)')

gen_stinger()
