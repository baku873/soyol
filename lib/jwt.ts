import { SignJWT, jwtVerify } from 'jose';

export type JwtPayload = {
  userId: string;
  email?: string;
  name: string;
  provider: 'local' | 'google' | 'facebook';
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET env var must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthJwt(payload: JwtPayload): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    provider: payload.provider,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyAuthJwt(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);

  const userId = (payload.userId ?? payload.sub) as string | undefined;
  const name = payload.name as string | undefined;
  const provider = payload.provider as JwtPayload['provider'] | undefined;

  if (!userId || !name || !provider) {
    throw new Error('Invalid token payload');
  }

  return {
    userId,
    email: payload.email as string | undefined,
    name,
    provider,
  };
}

