import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";

import { RADIO_STATIONS } from "@/lib/content";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stationId, setStationId] = useState(RADIO_STATIONS[0]!.id);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const station = RADIO_STATIONS.find((s) => s.id === stationId) ?? RADIO_STATIONS[0]!;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  async function play() {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    setLoading(true);
    try {
      audio.volume = muted ? 0 : volume;
      await audio.play();
      setPlaying(true);
    } catch {
      setError("This stream could not be played in your browser. Try another station.");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void play();
  }

  function selectStation(id: string) {
    if (id === stationId) return;
    const wasPlaying = playing;
    const audio = audioRef.current;
    audio?.pause();
    setPlaying(false);
    setStationId(id);
    setError(null);
    if (wasPlaying) {
      // Wait for the new src to bind before resuming.
      window.setTimeout(() => void play(), 60);
    }
  }

  return (
    <section className="glass-strong rounded-3xl p-6 sm:p-8" aria-label="Gospel Radio">
      <audio
        ref={audioRef}
        src={station.url}
        preload="none"
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          if (playing || loading) {
            setError("Stream unavailable right now. Try another station.");
          }
          setLoading(false);
          setPlaying(false);
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Radio className="size-5 text-gold" aria-hidden />
          <div>
            <h2 className="text-2xl leading-none">Gospel Radio</h2>
            <p className="mt-1 text-sm text-muted-foreground">{station.tagline}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-glass-border px-3 py-1 text-xs font-semibold tracking-widest uppercase",
            playing ? "text-live" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full bg-current",
              playing && "animate-pulse",
            )}
            aria-hidden
          />
          Live
        </span>
      </div>

      <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${station.name}` : `Play ${station.name}`}
          className="bg-gradient-grace glow-grace flex size-16 shrink-0 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {loading ? (
            <Loader2 className="size-6 animate-spin" aria-hidden />
          ) : playing ? (
            <Pause className="size-6" aria-hidden />
          ) : (
            <Play className="size-6 translate-x-0.5" aria-hidden />
          )}
        </button>

        <div className="flex-1">
          <p className="font-display text-3xl text-gold">{station.name}</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="text-muted-foreground transition-colors hover:text-gold"
            >
              {muted || volume === 0 ? (
                <VolumeX className="size-5" aria-hidden />
              ) : (
                <Volume2 className="size-5" aria-hidden />
              )}
            </button>
            <Slider
              value={[muted ? 0 : Math.round(volume * 100)]}
              max={100}
              step={1}
              aria-label="Volume"
              onValueChange={([next]) => {
                setMuted(false);
                setVolume((next ?? 0) / 100);
              }}
              className="max-w-56"
            />
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {muted ? 0 : Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Stations
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {RADIO_STATIONS.map((s) => {
            const active = s.id === stationId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStation(s.id)}
                aria-pressed={active}
                className={cn(
                  "glass rounded-2xl px-4 py-3 text-left transition-all hover:-translate-y-0.5",
                  active && "border-gold/60 glow-gold",
                )}
              >
                <span
                  className={cn(
                    "font-display text-lg",
                    active ? "text-gold" : "text-foreground",
                  )}
                >
                  {s.name}
                </span>
                <span className="block text-xs text-muted-foreground">{s.tagline}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p role="status" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
