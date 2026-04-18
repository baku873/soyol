/**
 * Video Call System Types
 * Shared types for the video call and in-call chat features.
 */

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface TokenResponse {
  token: string;
}

export interface TokenErrorResponse {
  error: string;
}

export interface TokenRequestPayload {
  roomName: string;
  identity: string;
  displayName?: string;
}

export interface RoomConfig {
  adaptiveStream: boolean;
  dynacast: boolean;
  videoCaptureDefaults: {
    resolution: { width: number; height: number; frameRate: number };
  };
}

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraEnabled: boolean;
}

export interface VideoCallState {
  connectionState: ConnectionState;
  participantCount: number;
  error: string | null;
  isScreenSharing: boolean;
}

export interface PermissionError {
  type: 'camera' | 'microphone' | 'both';
  message: string;
}
