export type WaitingRoomStatus = 'waiting' | 'admitted';

export interface WaitingRoomJoinResponse {
  sessionId: string;
  status: WaitingRoomStatus;
  concertName: string;
  backendError?: string;
  /** `true` khi tải cao — user phải chờ; `false` thì được vào mua vé ngay */
  waitingRoomRequired?: boolean;
  position?: number;
  estimatedWaitSeconds?: number;
  token?: string;
  tokenExpiresAt?: number;
}

export interface WaitingRoomPollResponse {
  status: WaitingRoomStatus;
  waitingRoomRequired?: boolean;
  /** Vị trí trong hàng đợi (1 = sắp đến lượt) */
  position?: number;
  /** Ước tính giây còn lại trước khi được vào */
  estimatedWaitSeconds?: number;
  token?: string;
  tokenExpiresAt?: number;
}

export interface WaitingRoomSession {
  sessionId: string;
  concertId: string;
  admittedToken?: string;
  tokenExpiresAt?: number;
}
