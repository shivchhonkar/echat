import { SOCKET_EVENTS } from "@echat/shared/events";
import {
  ICE_SERVERS,
  attachAudioStream,
  drainIceQueue,
  toIceCandidate,
  toSessionDescription,
} from "./webrtc.js";

export function createVoiceCallManager(socket, sessionId, localRole, options = {}) {
  const {
    onActiveChange,
    onOutboundRingingChange,
    onSelfMuteChange,
    onRemoteMuteChange,
    onAdminMutedChange,
    getRemoteAudioEl,
  } = options;

  let pc = null;
  let localStream = null;
  let remoteStream = null;
  let selfMuted = false;
  let remoteMuted = false;
  let mutedByAdmin = false;
  const pendingCandidates = [];

  function emitMuteState() {
    socket.emit(SOCKET_EVENTS.VOICE_MUTE_STATE, {
      sessionId,
      role: localRole,
      muted: selfMuted,
    });
  }

  function applyLocalMicState() {
    const effectiveMuted = selfMuted || (localRole === "user" && mutedByAdmin);
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !effectiveMuted;
    });
  }

  function notifyActive(active) {
    onActiveChange?.(active);
  }

  async function ensureLocalStream() {
    if (localStream) return localStream;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone is not supported in this browser");
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    applyLocalMicState();
    return localStream;
  }

  async function attachRemoteAudio() {
    const audioEl = typeof getRemoteAudioEl === "function" ? getRemoteAudioEl() : null;
    if (audioEl && remoteStream) {
      await attachAudioStream(audioEl, remoteStream);
    }
  }

  function setupPeerConnection() {
    pc?.close();
    pendingCandidates.length = 0;
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(SOCKET_EVENTS.VOICE_CALL_ICE, { sessionId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      remoteStream = event.streams[0] || null;
      attachRemoteAudio();
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === "failed" || pc?.connectionState === "disconnected") {
        endCall(false);
      }
    };
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

  async function startCall() {
    if (pc) return;
    await ensureLocalStream();
    setupPeerConnection();
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit(SOCKET_EVENTS.VOICE_CALL_OFFER, {
      sessionId,
      offer: pc.localDescription,
      callerRole: localRole,
    });
    if (localRole === "admin") {
      notifyActive(true);
      emitMuteState();
    } else {
      onOutboundRingingChange?.(true);
    }
  }

  async function handleOffer({ offer }) {
    if (!offer) return;
    if (pc) {
      await endCall(false);
    }
    await ensureLocalStream();
    setupPeerConnection();
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    await pc.setRemoteDescription(toSessionDescription(offer));
    await drainIceQueue(pc, pendingCandidates);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit(SOCKET_EVENTS.VOICE_CALL_ANSWER, { sessionId, answer: pc.localDescription });
    notifyActive(true);
    emitMuteState();
    await attachRemoteAudio();
  }

  async function handleAnswer({ answer }) {
    if (!pc || !answer) return;
    await pc.setRemoteDescription(toSessionDescription(answer));
    await drainIceQueue(pc, pendingCandidates);
    onOutboundRingingChange?.(false);
    notifyActive(true);
    emitMuteState();
    await attachRemoteAudio();
    requestAnimationFrame(() => {
      attachRemoteAudio();
    });
  }

  async function flushExternalIce(candidates = []) {
    for (const payload of candidates) {
      await handleIce(payload);
    }
  }

  function resendOffer() {
    if (!pc?.localDescription) return;
    socket.emit(SOCKET_EVENTS.VOICE_CALL_OFFER, {
      sessionId,
      offer: pc.localDescription,
      callerRole: localRole,
    });
    if (localRole === "user") {
      onOutboundRingingChange?.(true);
    }
  }

  function toggleSelfMute() {
    if (localRole === "user" && mutedByAdmin) return false;
    selfMuted = !selfMuted;
    applyLocalMicState();
    onSelfMuteChange?.(selfMuted);
    emitMuteState();
    return selfMuted;
  }

  function setSelfMuted(muted) {
    if (localRole === "user" && mutedByAdmin && !muted) return;
    selfMuted = !!muted;
    applyLocalMicState();
    onSelfMuteChange?.(selfMuted);
    emitMuteState();
  }

  function handleRemoteMuteState({ role, muted }) {
    if (role === localRole) return;
    remoteMuted = !!muted;
    onRemoteMuteChange?.(remoteMuted);
  }

  function handleAdminRemoteMute({ muted }) {
    if (localRole !== "user") return;
    mutedByAdmin = !!muted;
    if (mutedByAdmin) {
      selfMuted = true;
    } else {
      selfMuted = false;
    }
    applyLocalMicState();
    onSelfMuteChange?.(selfMuted || mutedByAdmin);
    onAdminMutedChange?.(mutedByAdmin);
  }

  function adminMuteCustomer(muted) {
    if (localRole !== "admin") return;
    socket.emit(SOCKET_EVENTS.VOICE_REMOTE_MUTE, { sessionId, muted: !!muted });
  }

  function endCall(emitEnd = true, reason = "hangup") {
    localStream?.getTracks().forEach((track) => track.stop());
    localStream = null;
    remoteStream = null;
    pendingCandidates.length = 0;
    pc?.close();
    pc = null;
    selfMuted = false;
    remoteMuted = false;
    mutedByAdmin = false;
    const audioEl = typeof getRemoteAudioEl === "function" ? getRemoteAudioEl() : null;
    if (audioEl) audioEl.srcObject = null;
    notifyActive(false);
    onOutboundRingingChange?.(false);
    onSelfMuteChange?.(false);
    onRemoteMuteChange?.(false);
    onAdminMutedChange?.(false);
    if (emitEnd) {
      socket.emit(SOCKET_EVENTS.VOICE_CALL_END, { sessionId, reason });
    }
  }

  function isActive() {
    return !!pc;
  }

  function getState() {
    return {
      selfMuted,
      remoteMuted,
      mutedByAdmin,
    };
  }

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIce,
    flushExternalIce,
    attachRemoteAudio,
    resendOffer,
    toggleSelfMute,
    setSelfMuted,
    handleRemoteMuteState,
    handleAdminRemoteMute,
    adminMuteCustomer,
    endCall,
    isActive,
    getState,
  };
}
