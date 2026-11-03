import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'public', 'audio');
const outputPath = path.join(outputDir, 'music-bed.wav');

const sampleRate = 44100;
const channels = 2;
const durationSeconds = 88;
const totalFrames = sampleRate * durationSeconds;
const data = new Int16Array(totalFrames * channels);

const chords = [
  [196.0, 246.94, 329.63],
  [174.61, 220.0, 293.66],
  [207.65, 261.63, 349.23],
  [155.56, 196.0, 261.63],
];

const envelope = (t, duration) => {
  const fadeIn = Math.min(1, t / 4);
  const fadeOut = Math.min(1, (duration - t) / 5);
  return Math.max(0, Math.min(fadeIn, fadeOut));
};

const softGate = (phase) => 0.58 + 0.42 * Math.sin(Math.PI * Math.max(0, phase));

for (let i = 0; i < totalFrames; i += 1) {
  const t = i / sampleRate;
  const bar = Math.floor(t / 4);
  const chord = chords[bar % chords.length];
  const env = envelope(t, durationSeconds);
  const beatPhase = (t % 1) / 1;

  let sample = 0;
  for (const [noteIndex, freq] of chord.entries()) {
    const drift = Math.sin(t * 0.09 + noteIndex) * 0.4;
    sample += Math.sin(2 * Math.PI * (freq + drift) * t) * (0.05 / (noteIndex + 1));
    sample += Math.sin(2 * Math.PI * (freq * 2 + drift) * t) * 0.012;
  }

  const pluckFreq = chord[(bar + 1) % chord.length] * 2;
  const pluckPhase = t % 2;
  const pluckEnv = Math.exp(-pluckPhase * 4.2);
  sample += Math.sin(2 * Math.PI * pluckFreq * t) * pluckEnv * 0.035;

  const pulse = Math.exp(-beatPhase * 9) * 0.028;
  sample += Math.sin(2 * Math.PI * 82.41 * t) * pulse;

  const shimmer = Math.sin(2 * Math.PI * 987.77 * t) * 0.004 * softGate(beatPhase);
  sample += shimmer;

  const mastered = Math.tanh(sample * 2.2) * env * 0.9;
  const left = mastered * (0.94 + 0.06 * Math.sin(t * 0.17));
  const right = mastered * (0.94 + 0.06 * Math.cos(t * 0.19));

  data[i * 2] = Math.round(left * 32767);
  data[i * 2 + 1] = Math.round(right * 32767);
}

const wavHeader = (dataLength) => {
  const buffer = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
};

await mkdir(outputDir, {recursive: true});
const audioBuffer = Buffer.from(data.buffer);
await writeFile(outputPath, Buffer.concat([wavHeader(audioBuffer.length), audioBuffer]));
console.log(`wrote ${outputPath}`);
