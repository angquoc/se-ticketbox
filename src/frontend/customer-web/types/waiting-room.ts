export type WaitingRoomStatus = 'waiting' | 'admitted';

export interface WaitingRoomJoinResponse {
  sessionId: string;
  status: WaitingRoomStatus;
  concertName: string;
  backendError?: string;
  /** `true` khi tải cao — user phải chờ; `false` thì được vào mua vé ngay */
  waitingRoomRequired?: boolean;
  token?: string;
  tokenExpiresAt?: number;
}

export interface WaitingRoomPollResponse {
  status: WaitingRoomStatus;
  waitingRoomRequired?: boolean;
  token?: string;
  tokenExpiresAt?: number;
}

export interface WaitingRoomSession {
  sessionId: string;
  concertId: string;
  admittedToken?: string;
  tokenExpiresAt?: number;
}
