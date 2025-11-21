export interface AdminJwtPayload {
  sub: string; // accountId
  login: string;
  type: 'admin';
  iat?: number;
  exp?: number;
} 