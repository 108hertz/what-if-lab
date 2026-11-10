/**
 * Sound for exported videos (change 0034): your own voice recorded over the preview, and an audio file from your
 * device (a voice-over or music). Mixed with Web Audio into the video's recording, so sound and picture share one
 * clock (the recorder already draws frames in real time). Everything stays in this tab's memory: a take or a file is
 * never saved, uploaded or put in a style. Browser-only; nothing here reaches the simulation.
 */

export interface Track {
  buf: AudioBuffer;
  /** Name to show (file name, or "Your take"). */
  name: string;
  /** 0…1.5. */
  gain: number;
  /** Seconds into the video where it starts (may be negative: skip that much of the track). */
  offset: number;
}

export interface Sound {
  voice: Track | null;
  music: (Track & { fadeIn: number; fadeOut: number; duck: boolean }) | null;
}

export const NO_SOUND: Sound = { voice: null, music: null };
export const hasSound = (s: Sound) => !!(s.voice || s.music);

let shared: AudioContext | null = null;
/** One audio context for the studio (browsers limit how many a page may open). */
export function audioContext(): AudioContext {
  if (!shared || shared.state === "closed") shared = new AudioContext();
  return shared;
}

/** Whether this browser can mix sound into a recording. */
export function soundSupported(): boolean {
  return typeof window !== "undefined" && typeof AudioContext !== "undefined" && typeof MediaRecorder !== "undefined"
    && typeof (AudioContext.prototype as AudioContext & { createMediaStreamDestination?: unknown }).createMediaStreamDestination === "function";
}

/** Decode an audio file picked from the device. */
export async function decodeFile(file: File): Promise<AudioBuffer> {
  const data = await file.arrayBuffer();
  return await audioContext().decodeAudioData(data);
}

/** Start recording the microphone; `stop()` ends the take and returns it decoded. The mic is released at once. */
export async function startTake(): Promise<{ stop(): Promise<AudioBuffer>; cancel(): void; level(): number }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const ended = new Promise<void>((r) => { rec.onstop = () => r(); });
  // A level meter while recording
  const ac = audioContext();
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = 512;
  src.connect(an);
  const buf = new Uint8Array(an.fftSize);
  const release = () => { src.disconnect(); stream.getTracks().forEach((t) => t.stop()); };
  rec.start(250);
  return {
    async stop() {
      if (rec.state !== "inactive") rec.stop();
      await ended;
      release();
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      return await ac.decodeAudioData(await blob.arrayBuffer());
    },
    cancel() { if (rec.state !== "inactive") rec.stop(); release(); },
    level() {
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
      return peak;
    },
  };
}

/** A running mix: where it plays, and how to stop it. */
export interface Mix { stop(): void }

/**
 * Play the sound from `fromS` seconds of the video, for a clip of `clipS` seconds, into `dest` (the speakers for the
 * preview, a recording's stream for the file). Starts `lead` seconds from now so it lines up with the first frame.
 */
export function playSound(sound: Sound, fromS: number, clipS: number, dest: AudioNode, lead = 0): Mix {
  const ac = audioContext();
  void ac.resume();
  const t0 = ac.currentTime + lead;
  const nodes: AudioScheduledSourceNode[] = [];
  const left = clipS - fromS;
  const schedule = (tr: Track, gain: GainNode) => {
    // Video second v plays track second (v - offset)
    const trackAt = fromS - tr.offset;
    const when = t0 + Math.max(0, -trackAt);
    const from = Math.max(0, trackAt);
    const dur = Math.min(tr.buf.duration - from, left - Math.max(0, -trackAt));
    if (dur <= 0) return null;
    const src = ac.createBufferSource();
    src.buffer = tr.buf;
    src.connect(gain);
    src.start(when, from, dur);
    nodes.push(src);
    return { when, dur, from };
  };
  const out = ac.createGain();
  out.connect(dest);
  let voiceSpan: [number, number] | null = null;
  if (sound.voice) {
    const g = ac.createGain();
    g.gain.value = sound.voice.gain;
    g.connect(out);
    const s = schedule(sound.voice, g);
    if (s) voiceSpan = [s.when, s.when + s.dur];
  }
  if (sound.music) {
    const m = sound.music;
    const g = ac.createGain();
    g.connect(out);
    const s = schedule(m, g);
    if (s) {
      const end = s.when + s.dur;
      const base = m.gain;
      g.gain.setValueAtTime(m.fadeIn > 0 && s.from < m.fadeIn ? 0 : base, s.when);
      if (m.fadeIn > 0 && s.from < m.fadeIn) g.gain.linearRampToValueAtTime(base, s.when + (m.fadeIn - s.from));
      // Lower the music while the voice speaks
      if (m.duck && voiceSpan && voiceSpan[1] > s.when) {
        const a = Math.max(s.when + 0.01, voiceSpan[0]), b = Math.min(end, voiceSpan[1]);
        if (b > a) {
          g.gain.setValueAtTime(base, a);
          g.gain.linearRampToValueAtTime(base * 0.3, a + 0.4);
          g.gain.setValueAtTime(base * 0.3, Math.max(a + 0.4, b - 0.4));
          g.gain.linearRampToValueAtTime(base, b);
        }
      }
      if (m.fadeOut > 0) {
        const fs = Math.max(s.when, end - m.fadeOut);
        g.gain.setValueAtTime(base, fs);
        g.gain.linearRampToValueAtTime(0, end);
      }
    }
  }
  return {
    stop() {
      for (const n of nodes) { try { n.stop(); } catch { /* already ended */ } n.disconnect(); }
      out.disconnect();
    },
  };
}

/** A stream track carrying the mix, for MediaRecorder. */
export function soundStream(): { dest: MediaStreamAudioDestinationNode; track: MediaStreamTrack } {
  const dest = audioContext().createMediaStreamDestination();
  return { dest, track: dest.stream.getAudioTracks()[0] };
}

/** A short wave outline (peaks), for drawing a track under the scrubber. */
export function peaks(buf: AudioBuffer, n = 160): Float32Array {
  const ch = buf.getChannelData(0), out = new Float32Array(n), per = Math.max(1, Math.floor(ch.length / n));
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (let j = i * per, e = Math.min(ch.length, j + per); j < e; j += 16) p = Math.max(p, Math.abs(ch[j]));
    out[i] = p;
  }
  return out;
}
