import { useAudioPlayer } from 'expo-audio';
import { useRef, useEffect } from 'react';

const sfx = {
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

export function useSound(soundEnabled = true) {
  const key        = useAudioPlayer(sfx.key);
  const correct    = useAudioPlayer(sfx.correct);
  const error      = useAudioPlayer(sfx.error);
  const eliminated = useAudioPlayer(sfx.eliminated);
  const tick       = useAudioPlayer(sfx.tick);
  const roundOver  = useAudioPlayer(sfx.roundOver);
  const victory    = useAudioPlayer(sfx.victory);
  const join       = useAudioPlayer(sfx.join);
  const vote       = useAudioPlayer(sfx.vote);

  const enabledRef = useRef(soundEnabled);
  useEffect(() => { enabledRef.current = soundEnabled; }, [soundEnabled]);

  const play = (player) => {
    if (!enabledRef.current) return;
    try { player.seekTo(0); player.play(); } catch {}
  };

  return {
    playKey:        () => play(key),
    playCorrect:    () => play(correct),
    playError:      () => play(error),
    playEliminated: () => play(eliminated),
    playTick:       () => play(tick),
    playRoundOver:  () => play(roundOver),
    playVictory:    () => play(victory),
    playJoin:       () => play(join),
    playVote:       () => play(vote),
  };
}
