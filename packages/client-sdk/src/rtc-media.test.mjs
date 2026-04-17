import test from "node:test";
import assert from "node:assert/strict";

import { canUseRTCMedia, createRTCMediaSession } from "./rtc-media.js";

function createFakeRTCRuntime() {
  const appended = [];
  const removed = [];
  const peerConnections = [];
  const audioElement = {
    style: {},
    parentNode: {
      removeChild(node) {
        removed.push(node);
      },
    },
    play() {
      return Promise.resolve();
    },
    srcObject: null,
  };

  class FakeMediaStream {
    constructor() {
      this._tracks = [];
    }

    addTrack(track) {
      this._tracks.push(track);
    }

    getTracks() {
      return this._tracks.slice();
    }
  }

  class FakeRTCPeerConnection {
    constructor(config) {
      this.config = config;
      this.connectionState = "new";
      this.localDescription = null;
      this.remoteDescription = null;
      this.addedTracks = [];
      this.addedIceCandidates = [];
      this.closed = false;
      peerConnections.push(this);
    }

    addTrack(track, stream) {
      this.addedTracks.push({ track, stream });
    }

    async createOffer() {
      return { type: "offer", sdp: "offer-sdp" };
    }

    async createAnswer() {
      return { type: "answer", sdp: "answer-sdp" };
    }

    async setLocalDescription(description) {
      this.localDescription = description;
    }

    async setRemoteDescription(description) {
      this.remoteDescription = description;
    }

    async addIceCandidate(candidate) {
      this.addedIceCandidates.push(candidate);
    }

    close() {
      this.closed = true;
    }
  }

  return {
    peerConnections,
    appended,
    removed,
    audioElement,
    target: {
      RTCPeerConnection: FakeRTCPeerConnection,
      MediaStream: FakeMediaStream,
      navigator: {
        mediaDevices: {
          async getUserMedia() {
            return {
              tracks: [{ id: "track-1", stopped: false, stop() { this.stopped = true; } }],
              getTracks() {
                return this.tracks;
              },
            };
          },
        },
      },
      document: {
        body: {
          appendChild(node) {
            appended.push(node);
          },
        },
        createElement() {
          return audioElement;
        },
      },
    },
  };
}

test("rtc media detects runtime capability from injected constructors", () => {
  const runtime = createFakeRTCRuntime();
  assert.equal(canUseRTCMedia({ runtimeTarget: runtime.target }), true);
  assert.equal(canUseRTCMedia({ runtimeTarget: {} }), false);
});

test("rtc media session negotiates descriptions, queues candidates, and cleans up streams", async () => {
  const runtime = createFakeRTCRuntime();
  const session = createRTCMediaSession({
    runtimeTarget: runtime.target,
  });

  const offer = await session.createOffer();
  assert.deepEqual(offer, { type: "offer", sdp: "offer-sdp" });
  assert.equal(runtime.peerConnections[0].addedTracks.length, 1);

  await session.addIceCandidate({
    candidate: "candidate-1",
    sdpMid: "0",
    sdpMLineIndex: 0,
  });
  assert.equal(runtime.peerConnections[0].addedIceCandidates.length, 0);

  await session.applyAnswer({ type: "answer", sdp: "answer-sdp" });
  assert.equal(runtime.peerConnections[0].addedIceCandidates.length, 1);

  runtime.peerConnections[0].connectionState = "connected";
  runtime.peerConnections[0].onconnectionstatechange();
  runtime.peerConnections[0].ontrack({
    track: { id: "remote-track-1" },
    streams: [],
  });

  assert.equal(runtime.appended.length, 1);
  assert.equal(session.getConnectionState(), "connected");
  assert.equal(session.getRemoteStream().getTracks().length, 1);

  session.stop();

  assert.equal(runtime.peerConnections[0].closed, true);
  assert.equal(runtime.removed.length, 1);
  assert.equal(session.getConnectionState(), "idle");
});
