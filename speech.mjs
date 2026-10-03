import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
export async function transcribe(audio) {
  if (!audio.length || audio.length > 8 * 1024 * 1024)
    throw new Error("Use a recording under 8 MB and 30 seconds.");
  const dir = await mkdtemp(path.join(tmpdir(), "deadline-speech-"));
  try {
    const input = path.join(dir, "input.audio"),
      wav = path.join(dir, "voice.wav"),
      output = path.join(dir, "transcript");
    await writeFile(input, audio, { mode: 0o600 });
    await run(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        input,
        "-t",
        "30",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        wav,
      ],
      { timeout: 20000, maxBuffer: 1024 * 1024 },
    );
    const pcm = await readFile(wav);
    let offset = 12,
      energy = 0,
      samples = 0;
    while (offset + 8 <= pcm.length) {
      const length = pcm.readUInt32LE(offset + 4);
      if (pcm.toString("ascii", offset, offset + 4) === "data") {
        const end = Math.min(offset + 8 + length, pcm.length);
        for (let i = offset + 8; i + 1 < end; i += 2) {
          const sample = pcm.readInt16LE(i) / 32768;
          energy += sample * sample;
          samples++;
        }
        break;
      }
      offset += 8 + length + (length % 2);
    }
    if (!samples || Math.sqrt(energy / samples) < 0.001)
      throw new Error(
        "Audio is silent or too quiet. Try again or type your request.",
      );
    await run(
      "whisper-cli",
      [
        "-m",
        path.resolve("models/ggml-base.en.bin"),
        "-f",
        wav,
        "-l",
        "en",
        "-nt",
        "-np",
        "-otxt",
        "-of",
        output,
      ],
      { timeout: 60000, maxBuffer: 1024 * 1024 },
    );
    const text = (await readFile(output + ".txt", "utf8")).trim();
    if (!text || /^(\[.*?\]|\(.*?\)|thank you[.!]?)$/i.test(text))
      throw new Error(
        "No clear speech detected. Try again or type your request.",
      );
    return { text, engine: "Whisper base.en · local", reviewRequired: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
