export const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function toSessionDescription(desc) {
  if (!desc) return null;
  if (desc instanceof RTCSessionDescription) return desc;
  return new RTCSessionDescription(desc);
}

export function toIceCandidate(candidate) {
  if (!candidate) return null;
  if (candidate instanceof RTCIceCandidate) return candidate;
  return new RTCIceCandidate(candidate);
}

export async function drainIceQueue(pc, queue) {
  while (queue.length) {
    const candidate = queue.shift();
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // ignore stale candidates
    }
  }
}

export async function attachAudioStream(audioEl, stream) {
  if (!audioEl || !stream) return;
  audioEl.srcObject = stream;
  try {
    await audioEl.play();
  } catch {
    // muted autoplay fallback is fine for WebRTC audio elements
  }
}
