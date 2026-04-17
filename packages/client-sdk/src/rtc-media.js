function getGlobalTarget() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  return {};
}

function trimValue(value) {
  return String(value || "").trim();
}

function serializeDescription(description) {
  if (!description) {
    return null;
  }
  return {
    type: trimValue(description.type),
    sdp: trimValue(description.sdp),
  };
}

function serializeCandidate(candidate) {
  if (!candidate) {
    return null;
  }
  return {
    candidate: trimValue(candidate.candidate),
    sdpMid: trimValue(candidate.sdpMid),
    sdpMLineIndex:
      Number.isFinite(Number(candidate.sdpMLineIndex)) ? Number(candidate.sdpMLineIndex) : 0,
    usernameFragment: trimValue(candidate.usernameFragment),
  };
}

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const normalized = {
    candidate: trimValue(candidate.candidate),
    sdpMid: trimValue(candidate.sdpMid),
    sdpMLineIndex:
      Number.isFinite(Number(candidate.sdpMLineIndex)) ? Number(candidate.sdpMLineIndex) : 0,
  };
  const usernameFragment = trimValue(candidate.usernameFragment);
  if (usernameFragment) {
    normalized.usernameFragment = usernameFragment;
  }
  return normalized;
}

function normalizeIceServers(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const urls = Array.isArray(item?.urls)
        ? item.urls.map((value) => trimValue(value)).filter(Boolean)
        : trimValue(item?.urls || item?.url);
      const normalized = { urls };
      const username = trimValue(item?.username);
      const credential = trimValue(item?.credential);
      if (username) {
        normalized.username = username;
      }
      if (credential) {
        normalized.credential = credential;
      }
      return normalized;
    })
    .filter((item) => {
      if (Array.isArray(item.urls)) {
        return item.urls.length > 0;
      }
      return Boolean(item.urls);
    });
}

function resolveRTCConstructors(runtimeTarget) {
  const target = runtimeTarget || getGlobalTarget();
  return {
    RTCPeerConnection:
      target.RTCPeerConnection || target.webkitRTCPeerConnection || target.mozRTCPeerConnection,
    RTCSessionDescription:
      target.RTCSessionDescription ||
      target.webkitRTCSessionDescription ||
      target.mozRTCSessionDescription ||
      null,
    RTCIceCandidate:
      target.RTCIceCandidate || target.webkitRTCIceCandidate || target.mozRTCIceCandidate || null,
    MediaStream: target.MediaStream || null,
    mediaDevices: target.navigator && target.navigator.mediaDevices ? target.navigator.mediaDevices : null,
    document: target.document || null,
  };
}

export function canUseRTCMedia(options = {}) {
  const runtime = resolveRTCConstructors(options.runtimeTarget);
  return Boolean(
    runtime.RTCPeerConnection &&
      runtime.mediaDevices &&
      typeof runtime.mediaDevices.getUserMedia === "function",
  );
}

function createHiddenAudioElement(doc) {
  if (!doc || typeof doc.createElement !== "function") {
    return null;
  }
  const audio = doc.createElement("audio");
  audio.autoplay = true;
  audio.playsInline = true;
  audio.muted = false;
  audio.style.display = "none";
  const root = doc.body || doc.documentElement;
  if (root && typeof root.appendChild === "function") {
    root.appendChild(audio);
  }
  return audio;
}

export function createRTCMediaSession(options = {}) {
  const runtime = resolveRTCConstructors(options.runtimeTarget);
  if (!runtime.RTCPeerConnection || !runtime.mediaDevices) {
    throw new Error("rtc_media_not_supported");
  }

  const onIceCandidate =
    typeof options.onIceCandidate === "function" ? options.onIceCandidate : () => {};
  const onTrack = typeof options.onTrack === "function" ? options.onTrack : () => {};
  const onConnectionStateChange =
    typeof options.onConnectionStateChange === "function"
      ? options.onConnectionStateChange
      : () => {};

  let peerConnection = null;
  let localStream = null;
  let remoteStream = null;
  let audioElement = null;
  let closed = false;
  let tracksAttached = false;
  let remoteDescriptionSet = false;
  const pendingCandidates = [];
  const defaultIceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  const resolvedIceServers = normalizeIceServers(options.iceServers);

  function getRemoteStream() {
    if (remoteStream) {
      return remoteStream;
    }
    if (runtime.MediaStream) {
      remoteStream = new runtime.MediaStream();
      return remoteStream;
    }
    remoteStream = {
      _tracks: [],
      addTrack(track) {
        this._tracks.push(track);
      },
      getTracks() {
        return this._tracks.slice();
      },
    };
    return remoteStream;
  }

  function ensureAudioSink() {
    if (audioElement || !runtime.document) {
      return audioElement;
    }
    audioElement = createHiddenAudioElement(runtime.document);
    return audioElement;
  }

  function attachRemoteStream() {
    const audio = ensureAudioSink();
    if (!audio || !remoteStream) {
      return;
    }
    if ("srcObject" in audio) {
      audio.srcObject = remoteStream;
    }
    if (typeof audio.play === "function") {
      Promise.resolve(audio.play()).catch(() => {});
    }
  }

  function ensurePeerConnection() {
    if (peerConnection) {
      return peerConnection;
    }
    peerConnection = new runtime.RTCPeerConnection({
      iceServers: resolvedIceServers.length ? resolvedIceServers : defaultIceServers,
    });

    peerConnection.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        return;
      }
      onIceCandidate(serializeCandidate(event.candidate));
    };

    peerConnection.onconnectionstatechange = () => {
      onConnectionStateChange(trimValue(peerConnection.connectionState || "unknown"));
    };

    peerConnection.ontrack = (event) => {
      const stream = getRemoteStream();
      if (event && Array.isArray(event.streams) && event.streams[0]) {
        remoteStream = event.streams[0];
      } else if (event && event.track && typeof stream.addTrack === "function") {
        stream.addTrack(event.track);
      }
      attachRemoteStream();
      onTrack(remoteStream || stream, event);
    };

    return peerConnection;
  }

  async function flushPendingCandidates() {
    if (!peerConnection || !remoteDescriptionSet || pendingCandidates.length === 0) {
      return;
    }
    while (pendingCandidates.length) {
      const nextCandidate = pendingCandidates.shift();
      if (!nextCandidate) {
        continue;
      }
      const candidate = runtime.RTCIceCandidate
        ? new runtime.RTCIceCandidate(nextCandidate)
        : nextCandidate;
      await peerConnection.addIceCandidate(candidate);
    }
  }

  async function ensureLocalAudio() {
    if (localStream) {
      return localStream;
    }
    localStream = await runtime.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    const pc = ensurePeerConnection();
    if (!tracksAttached && localStream && typeof localStream.getTracks === "function") {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
      tracksAttached = true;
    }

    return localStream;
  }

  async function createOffer() {
    await ensureLocalAudio();
    const pc = ensurePeerConnection();
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);
    return serializeDescription(pc.localDescription || offer);
  }

  async function applyOffer(offer) {
    if (!offer) {
      throw new Error("rtc_offer_required");
    }
    await ensureLocalAudio();
    const pc = ensurePeerConnection();
    const description = runtime.RTCSessionDescription
      ? new runtime.RTCSessionDescription(offer)
      : offer;
    await pc.setRemoteDescription(description);
    remoteDescriptionSet = true;
    await flushPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return serializeDescription(pc.localDescription || answer);
  }

  async function applyAnswer(answer) {
    if (!answer) {
      throw new Error("rtc_answer_required");
    }
    await ensureLocalAudio();
    const pc = ensurePeerConnection();
    const description = runtime.RTCSessionDescription
      ? new runtime.RTCSessionDescription(answer)
      : answer;
    await pc.setRemoteDescription(description);
    remoteDescriptionSet = true;
    await flushPendingCandidates();
  }

  async function addIceCandidate(candidate) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) {
      return;
    }
    const pc = ensurePeerConnection();
    if (!remoteDescriptionSet) {
      pendingCandidates.push(normalized);
      return;
    }
    const rtcCandidate = runtime.RTCIceCandidate
      ? new runtime.RTCIceCandidate(normalized)
      : normalized;
    await pc.addIceCandidate(rtcCandidate);
  }

  function stopStream(stream) {
    if (!stream || typeof stream.getTracks !== "function") {
      return;
    }
    stream.getTracks().forEach((track) => {
      if (track && typeof track.stop === "function") {
        track.stop();
      }
    });
  }

  function stop() {
    if (closed) {
      return;
    }
    closed = true;

    try {
      stopStream(localStream);
      stopStream(remoteStream);
      if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
      }
      if (audioElement) {
        if ("srcObject" in audioElement) {
          audioElement.srcObject = null;
        }
        if (audioElement.parentNode) {
          audioElement.parentNode.removeChild(audioElement);
        }
      }
    } finally {
      peerConnection = null;
      localStream = null;
      remoteStream = null;
      audioElement = null;
      tracksAttached = false;
      remoteDescriptionSet = false;
      pendingCandidates.length = 0;
    }
  }

  return {
    canUseRTCMedia,
    ensureLocalAudio,
    createOffer,
    applyOffer,
    applyAnswer,
    addIceCandidate,
    stop,
    getConnectionState() {
      return peerConnection ? trimValue(peerConnection.connectionState || "new") : "idle";
    },
    getLocalStream() {
      return localStream;
    },
    getRemoteStream() {
      return remoteStream;
    },
  };
}
