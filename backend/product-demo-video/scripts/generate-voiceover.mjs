import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.resolve(projectRoot, '..');
const publicAudioDir = path.join(projectRoot, 'public', 'audio');
const scriptPath = path.join(publicAudioDir, 'voiceover-script.txt');
const outputPath = path.join(publicAudioDir, 'voiceover.mp3');
const envPath = path.join(appRoot, '.env');

const parseEnv = (contents) => {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsAt = line.indexOf('=');
    if (equalsAt === -1) {
      continue;
    }

    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
};

const rootEnv = existsSync(envPath) ? parseEnv(await readFile(envPath, 'utf8')) : {};
const apiKey = process.env.ELEVENLABS_API_KEY || rootEnv.ELEVENLABS_API_KEY;
const voiceId =
  process.env.ELEVENLABS_VOICE_ID ||
  rootEnv.ELEVENLABS_VOICE_ID ||
  '21m00Tcm4TlvDq8ikWAM';

if (!apiKey) {
  throw new Error('ELEVENLABS_API_KEY is missing. Add it to the environment or .env to generate voiceover.');
}

const text = await readFile(scriptPath, 'utf8');

const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'audio/mpeg',
  },
  body: JSON.stringify({
    text,
    model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
    voice_settings: {
      stability: Number(process.env.ELEVENLABS_STABILITY || 0.48),
      similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST || 0.76),
      style: Number(process.env.ELEVENLABS_STYLE || 0.26),
      use_speaker_boost: true,
    },
  }),
});

if (!response.ok) {
  const body = await response.text().catch(() => '');
  throw new Error(`ElevenLabs request failed with ${response.status}: ${body.slice(0, 300)}`);
}

await mkdir(publicAudioDir, {recursive: true});
const audioBuffer = Buffer.from(await response.arrayBuffer());
await writeFile(outputPath, audioBuffer);
console.log(`wrote ${outputPath}`);
