/**
 * ICE Configuration for WebRTC
 * Free STUN servers for NAT traversal
 */

const iceConfig = [
  {
    urls: 'stun:stun.l.google.com:19302'
  },
  {
    urls: 'stun:stun1.l.google.com:19302'
  },
  {
    urls: 'stun:stun2.l.google.com:19302'
  }
];

module.exports = iceConfig;





