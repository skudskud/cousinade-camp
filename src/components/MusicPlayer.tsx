import { useState, useRef, useEffect } from 'react';

const LOFI_STREAM_URL = 'https://streams.ilovemusic.de/iloveradio17.mp3';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(LOFI_STREAM_URL);
    audioRef.current.volume = volume;
    audioRef.current.loop = true;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card pixel-border px-4 py-2">
      <button
        onClick={togglePlay}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity ${isPlaying ? 'text-primary' : 'text-muted-foreground'}`}
        title={isPlaying ? 'Pause musique' : 'Jouer musique lofi'}
      >
        <span className="text-xl">{isPlaying ? '🔊' : '🔇'}</span>
        <span className="text-xs" style={{ fontFamily: '"Press Start 2P"' }}>
          {isPlaying ? 'Lofi ON' : 'Lofi OFF'}
        </span>
      </button>
      {isPlaying && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 h-2 accent-primary cursor-pointer"
          title="Volume"
        />
      )}
    </div>
  );
};

export default MusicPlayer;
