export type WaitingRoomStatus = 'waiting' | 'admitted';

export interface WaitingRoomJoinResponse {
  sessionId: string;
  status: WaitingRoomStatus;
  concertName: string;
  token?: string;
  tokenExpiresAt?: number;
}

export interface WaitingRoomPollResponse {
  status: WaitingRoomStatus;
  token?: string;
  tokenExpiresAt?: number;
}

export interface WaitingRoomSession {
  sessionId: string;
  concertId: string;
  admittedToken?: string;
  tokenExpiresAt?: number;
}
