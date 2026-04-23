import jwt from 'jsonwebtoken';
import { getSecrets } from './secrets.js';

export async function authenticate(pin) {
  const { userPin, adminPin } = await getSecrets();
  if (pin === adminPin) return 'admin';
  if (pin === userPin) return 'user';
  return null;
}

export async function signToken(role) {
  const { jwtSecret } = await getSecrets();
  return jwt.sign({ role }, jwtSecret, { expiresIn: '30d' });
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
      context: { role: decoded.role },
    };
  } catch {
    throw new Error('Unauthorized');
  }
}
