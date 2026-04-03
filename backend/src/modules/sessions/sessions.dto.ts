export interface SessionResponseDto {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: Date;
  createdAt: Date;
  current: boolean;
  scheduledLogoutAt?: Date | null;
}

export interface CurrentSessionStatusDto {
  active: boolean;
  current: boolean;
  warning: boolean;
  reason: string | null;
  logoutAt: Date | null;
  secondsRemaining: number | null;
}
