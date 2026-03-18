export interface SessionResponseDto {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: Date;
  createdAt: Date;
  current: boolean;
}
