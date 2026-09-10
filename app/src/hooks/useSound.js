import { useAudioPlayer } from 'expo-audio';
import { useRef, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';

const sfx = {
  musicLow:   require('../../assets/sfx_music_low.wav'),
  musicMid:   require('../../assets/sfx_music_mid.wav'),
  musicHigh:  require('../../assets/sfx_music_high.wav'),
  stinger:    require('../../assets/sfx_music_stinger.wav'),
  key:        require('../../assets/sfx_key.wav'),
  correct:    require('../../assets/sfx_correct.wav'),
  error:      require('../../assets/sfx_error.wav'),
  eliminated: require('../../assets/sfx_eliminated.wav'),
  tick:       require('../../assets/sfx_tick.wav'),
  roundOver:  require('../../assets/sfx_round_over.wav'),
  victory:    require('../../assets/sfx_victory.wav'),
  join:       require('../../assets/sfx_join.wav'),
  vote:       require('../../assets/sfx_vote.wav'),
};

// PLAYING  — active round, intensity layers can swap
// AMBIENT  — player done (answered/eliminated), only low plays
// STOPPED  — no music
const MODE = { STOPPED: 0, PLAYING: 1, AMBIENT: 2 };

export function useSound(soundEnabled = true, musicEnabled = true) {
  const musicLow  = useAudioPlayer(sfx.musicLow);
  const musicMid  = useAudioPlayer(sfx.musicMid);
  const musicHigh = useAudioPlayer(sfx.musicHigh);
  const stinger   = useAudioPlayer(sfx.stinger);
  const key       = useAudioPlayer(sfx.key);
  const correct   = useAudioPlayer(sfx.correct);
  const error     = useAudioPlayer(sfx.error);
  const elim      = useAudioPlayer(sfx.eliminated);
  const tick      = useAudioPlayer(sfx.tick);
  const roundOver = useAudioPlayer(sfx.roundOver);
  const victory   = useAudioPlayer(sfx.victory);
  const join      = useAudioPlayer(sfx.join);
  const vote      = useAudioPlayer(sfx.vote);

  const enabledRef      = useRef(soundEnabled);
  const musicEnabledRef = useRef(musicEnabled);
  const modeRef         = useRef(MODE.STOPPED);
  const volTimersRef    = useRef({ low: null, mid: null, high: null });
  const ambientTimerRef = useRef(null);
  const stingerTimerRef = useRef(null);
  const stopTimerRef    = useRef(null);

  useEffect(() => { enabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => {
    musicEnabledRef.current = musicEnabled;
    if (!musicEnabled) {
      // mute all layers immediately
      try { [musicLow, musicMid, musicHigh].forEach(p => { p.volume = 0; p.pause(); }); } catch {}
    } else if (modeRef.current !== MODE.STOPPED) {
      // restore low layer
      try { musicLow.volume = 0; musicLow.play(); fadeTo(musicLow, 'low', 1.0, 400); } catch {}
    }
  }, [musicEnabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (modeRef.current === MODE.STOPPED) return;
      try {
        if (s === 'background' || s === 'inactive') [musicLow, musicMid, musicHigh].forEach(p => p.pause());
        else if (s === 'active' && enabledRef.current)  [musicLow, musicMid, musicHigh].forEach(p => p.play());
      } catch {}
    });
    return () => sub.remove();
  }, [musicLow, musicMid, musicHigh]);

  const logVol = useCallback((v) => Math.pow(Math.max(0, Math.min(1, v)), 2), []);

  const fadeTo = useCallback((player, key, target, ms) => {
    clearTimeout(volTimersRef.current[key]);
    const start = Date.now(), from = player.volume ?? 0;
    const run = () => {
      try {
        const t    = Math.min((Date.now() - start) / ms, 1);
        player.volume = from + (target - from) * t;
        if (t < 1) volTimersRef.current[key] = setTimeout(run, 16);
      } catch {}
    };
    run();
  }, []);

  const stopAllMusic = useCallback(() => {
    try { [musicLow, musicMid, musicHigh].forEach(p => { p.volume = 0; p.pause(); }); } catch {}
  }, [musicLow, musicMid, musicHigh]);

  const play = useCallback((player) => {
    if (!enabledRef.current) return;
    try { player.seekTo(0); player.play(); } catch {}
  }, []);

  // ── music lifecycle ───────────────────────────────────────────────────────

  // target volumes per mode+intensity
  // low is always 1.0, mid/high are additive layers
  const _applyVolumes = useCallback((midVol, highVol, ms) => {
    // scale so low(1.0) + mid + high never exceeds 1.0 combined
    const total = 1.0 + midVol + highVol;
    const scale = total > 1.0 ? 1.0 / total : 1.0;
    fadeTo(musicLow,  'low',  1.0    * scale, ms);
    fadeTo(musicMid,  'mid',  midVol * scale, ms);
    fadeTo(musicHigh, 'high', highVol * scale, ms);
  }, [musicLow, musicMid, musicHigh, fadeTo]);

  const playMusic = useCallback(() => {
    if (!enabledRef.current || !musicEnabledRef.current) return;
    if (modeRef.current !== MODE.STOPPED) {
      // resuming from ambient — just re-enable intensity changes
      modeRef.current = MODE.PLAYING;
      return;
    }
    clearTimeout(stopTimerRef.current);
    try {
      [musicLow, musicMid, musicHigh].forEach(p => {
        p.loop = true; p.volume = 0; p.seekTo(0); p.play();
      });
      modeRef.current = MODE.PLAYING;
      fadeTo(musicLow, 'low', 1.0, 500);
      // mid and high start at 0, setMusicIntensity will raise them
    } catch {}
  }, [musicLow, musicMid, musicHigh, fadeTo]);

  // volume mixing — blocked when not PLAYING
  const setMusicIntensity = useCallback((ratio) => {
    if (!enabledRef.current || modeRef.current !== MODE.PLAYING) return;
    const midVol  = ratio <= 0.66 ? logVol((0.66 - ratio) / 0.33) : 0;
    const highVol = ratio <= 0.33 ? logVol((0.33 - ratio) / 0.33) : 0;
    _applyVolumes(Math.min(midVol, 1), Math.min(highVol, 1), 800);
  }, [_applyVolumes, logVol]);

  // answered correctly or ambient screen — fade out mid+high gently
  const transitionToAmbient = useCallback(() => {
    if (!enabledRef.current || modeRef.current === MODE.STOPPED) return;
    modeRef.current = MODE.AMBIENT;
    _applyVolumes(0, 0, 400);
  }, [_applyVolumes]);

  // eliminated — hard fast drop of mid+high
  const transitionToEliminated = useCallback(() => {
    if (!enabledRef.current || modeRef.current !== MODE.PLAYING) return;
    modeRef.current = MODE.AMBIENT;
    _applyVolumes(0, 0, 80);
  }, [_applyVolumes]);

  const stopMusic = useCallback(() => {
    if (modeRef.current === MODE.STOPPED) return;
    modeRef.current = MODE.STOPPED;
    clearTimeout(ambientTimerRef.current);
    clearTimeout(stingerTimerRef.current);
    clearTimeout(stopTimerRef.current);
    _applyVolumes(0, 0, 300);
    fadeTo(musicLow, 'low', 0, 300);
    stopTimerRef.current = setTimeout(() => stopAllMusic(), 320);
  }, [musicLow, _applyVolumes, fadeTo, stopAllMusic]);

  const playStinger = useCallback(() => {
    if (!enabledRef.current) return;
    // duck all layers
    fadeTo(musicLow,  'low',  0.2, 100);
    fadeTo(musicMid,  'mid',  0,   100);
    fadeTo(musicHigh, 'high', 0,   100);
    try { stinger.seekTo(0); stinger.play(); } catch {}
    clearTimeout(stingerTimerRef.current);
    stingerTimerRef.current = setTimeout(() => {
      if (modeRef.current === MODE.STOPPED) return;
      fadeTo(musicLow, 'low', 1.0, 400);
      // mid/high stay at 0 — ambient mode after round over
    }, 1800);
  }, [stinger, fadeTo]);

  const isMusicPlaying = useCallback(() => modeRef.current !== MODE.STOPPED, []);

  const playKey        = useCallback(() => play(key),       [play, key]);
  const playCorrect    = useCallback(() => play(correct),   [play, correct]);
  const playError      = useCallback(() => play(error),     [play, error]);
  const playEliminated = useCallback(() => play(elim),      [play, elim]);
  const playTick       = useCallback(() => play(tick),      [play, tick]);
  const playRoundOver  = useCallback(() => play(roundOver), [play, roundOver]);
  const playVictory    = useCallback(() => play(victory),   [play, victory]);
  const playJoin       = useCallback(() => play(join),      [play, join]);
  const playVote       = useCallback(() => play(vote),      [play, vote]);

  return {
    playMusic, stopMusic, isMusicPlaying,
    setMusicIntensity, transitionToAmbient, transitionToEliminated,
    playStinger,
    playKey, playCorrect, playError, playEliminated,
    playTick, playRoundOver, playVictory, playJoin, playVote,
  };
}
