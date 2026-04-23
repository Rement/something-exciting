import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const USER_PIN = process.env.USER_PIN;
const ADMIN_PIN = process.env.ADMIN_PIN;

export function authenticate(pin) {
  if (pin === ADMIN_PIN) return 'admin';
  if (pin === USER_PIN) return 'user';
  return null;
}

export function signToken(role) {
  return jwt.sign({ role }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/** API Gateway TOKEN authorizer */
export async function authorize(event) {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthorized');

  try {
    const decoded = verifyToken(token);
    // Allow all methods/resources for this API — result is cached per token
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
