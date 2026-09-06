import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
}

export const generateAccessToken = (userId: string): string => {
  const payload: TokenPayload = { userId };
  const secret = process.env.JWT_SECRET!;
  const expiresIn = (process.env.JWT_EXPIRE || '15m') as string;
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

export const generateRefreshToken = (userId: string): string => {
  const payload: TokenPayload = { userId };
  const secret = process.env.JWT_REFRESH_SECRET!;
  const expiresIn = (process.env.JWT_REFRESH_EXPIRE || '7d') as string;
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
};
