import jwt from 'jsonwebtoken';
import { getSecrets } from './secrets.js';

export async function authenticate(pin) {
  const secrets = await getSecrets();
  if (pin === secrets.adminPin) return 'admin';
  return null;
}

export async function signToken(payload) {
  const { jwtSecret } = await getSecrets();
  const data = typeof payload === 'string' ? { role: payload } : payload;
  return jwt.sign(data, jwtSecret, { expiresIn: '30d' });
}

export async function verifyToken(token) {
  const { jwtSecret } = await getSecrets();
  return jwt.verify(token, jwtSecret);
}

/** API Gateway TOKEN authorizer */
export async function authorize(event) {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthorized');

  try {
    const decoded = await verifyToken(token);
    const arnBase = event.methodArn.replace(/\/[^/]+\/[^/]+$/, '/*/*');
    return {
      principalId: decoded.role,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{ Action: 'execute-api:Invoke', Effect: 'Allow', Resource: arnBase }],
      },
      context: { role: decoded.role, eventId: decoded.eventId || '' },
    };
  } catch {
    throw new Error('Unauthorized');
  }
}
