const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

/**
 * Clone a voice from audio samples.
 * Requires at least 1 audio file, ideally 3+ minutes of clean speech.
 */
export const createVoiceClone = async (
  apiKey: string,
  name: string,
  audioFiles: { buffer: Buffer; filename: string; mimeType: string }[]
): Promise<{ voiceId: string }> => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", `AiC voice clone for ${name}`);

  for (const file of audioFiles) {
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimeType });
    formData.append("files", blob, file.filename);
  }

  const res = await fetch(`${ELEVENLABS_API}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs voice clone failed: ${err}`);
  }

  const data = (await res.json()) as { voice_id: string };
  return { voiceId: data.voice_id };
};

/**
 * Generate speech from text using a cloned or preset voice.
 */
export const generateSpeech = async (
  apiKey: string,
  voiceId: string,
  text: string,
  options?: {
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
  }
): Promise<{ audioBuffer: Buffer; contentType: string }> => {
  const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: options?.modelId ?? "eleven_multilingual_v2",
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarityBoost ?? 0.75
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS failed: ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer: buffer,
    contentType: res.headers.get("content-type") ?? "audio/mpeg"
  };
};

/**
 * List available voices (includes cloned voices).
 */
export const listVoices = async (
  apiKey: string
): Promise<Array<{ voice_id: string; name: string; category: string }>> => {
  const res = await fetch(`${ELEVENLABS_API}/voices`, {
    headers: { "xi-api-key": apiKey }
  });

  if (!res.ok) throw new Error("Failed to list ElevenLabs voices");

  const data = (await res.json()) as { voices: Array<{ voice_id: string; name: string; category: string }> };
  return data.voices ?? [];
};
