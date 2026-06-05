import { SOCKET_EVENTS } from "@echat/shared/events";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function toSessionDescription(desc) {
  if (!desc) return null;
  if (desc instanceof RTCSessionDescription) return desc;
  return new RTCSessionDescription(desc);
}

function toIceCandidate(candidate) {
  if (!candidate) return null;
  if (candidate instanceof RTCIceCandidate) return candidate;
  return new RTCIceCandidate(candidate);
}

async function drainIceQueue(pc, queue) {
  while (queue.length) {
    const candidate = queue.shift();
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // ignore stale candidates
    }
  }
}

async function attachToVideo(videoEl, stream) {
  if (!videoEl || !stream) return;
  videoEl.srcObject = stream;
  try {
    await videoEl.play();
  } catch {
    // autoplay policies should not block muted playback
  }
}

export function createScreenSharePublisher(socket, sessionId, onStateChange) {
  let pc = null;
  let stream = null;
  const pendingCandidates = [];

  async function handleIce({ candidate }) {
    if (!pc || !candidate) return;
    const ice = toIceCandidate(candidate);
    if (!pc.remoteDescription) {
      pendingCandidates.push(ice);
      return;
    }
    await pc.addIceCandidate(ice);
  }

  async function start() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported in this browser");
    }
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
      track.onended = () => stop();
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(SOCKET_EVENTS.SCREEN_SHARE_ICE, { sessionId, candidate: event.candidate });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit(SOCKET_EVENTS.SCREEN_SHARE_OFFER, { sessionId, offer: pc.localDescription });
    onStateChange?.(true);
  }

  async function handleAnswer({ answer }) {
    if (!pc || !answer) return;
    await pc.setRemoteDescription(toSessionDescription(answer));
    await drainIceQueue(pc, pendingCandidates);
  }

  function resendOffer() {
    if (!pc?.localDescription) return;
    socket.emit(SOCKET_EVENTS.SCREEN_SHARE_OFFER, { sessionId, offer: pc.localDescription });
  }

  function stop() {
    stream?.getTracks().forEach((track) => track.stop());
    pc?.close();
    stream = null;
    pc = null;
    pendingCandidates.length = 0;
    socket.emit(SOCKET_EVENTS.SCREEN_SHARE_STOP, { sessionId });
    onStateChange?.(false);
  }

  function isSharing() {
    return !!pc;
  }

  return { start, handleAnswer, handleIce, resendOffer, stop, isSharing };
}

export function createScreenShareViewer(socket, sessionId, getVideoEl, onStateChange) {
  let pc = null;
  let remoteStream = null;
  const pendingCandidates = [];

  function resolveVideoEl() {
    return typeof getVideoEl === "function" ? getVideoEl() : getVideoEl;
  }

  async function attachStream() {
    const videoEl = resolveVideoEl();
    if (videoEl && remoteStream) {
      await attachToVideo(videoEl, remoteStream);
    }
  }

  async function handleOffer({ offer }) {
    if (!offer) return;
    pc?.close();
    pendingCandidates.length = 0;
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (event) => {
      remoteStream = event.streams[0] || null;
      attachStream();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(SOCKET_EVENTS.SCREEN_SHARE_ICE, { sessionId, candidate: event.candidate });
      }
    };

    await pc.setRemoteDescription(toSessionDescription(offer));
    await drainIceQueue(pc, pendingCandidates);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit(SOCKET_EVENTS.SCREEN_SHARE_ANSWER, { sessionId, answer: pc.localDescription });
    onStateChange?.(true);
    await attachStream();
  }

  async function handleIce({ candidate }) {
    if (!pc || !candidate) return;
    const ice = toIceCandidate(candidate);
    if (!pc.remoteDescription) {
      pendingCandidates.push(ice);
      return;
    }
    await pc.addIceCandidate(ice);
  }

  function stop() {
    const videoEl = resolveVideoEl();
    if (videoEl) videoEl.srcObject = null;
    remoteStream = null;
    pendingCandidates.length = 0;
    pc?.close();
    pc = null;
    onStateChange?.(false);
  }

  return { handleOffer, handleIce, stop, attachStream };
}
