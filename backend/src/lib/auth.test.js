import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// Set env vars before importing the module
process.env.JWT_SECRET = 'test-secret-that-is-32-chars-long';
process.env.USER_PIN = '1234';
process.env.ADMIN_PIN = '5678';

const { authenticate, signToken, verifyToken, authorize } = await import('./auth.js');

describe('authenticate', () => {
  it('returns "user" for user PIN', () => {
    assert.equal(authenticate('1234'), 'user');
  });

  it('returns "admin" for admin PIN', () => {
    assert.equal(authenticate('5678'), 'admin');
  });

  it('returns null for wrong PIN', () => {
    assert.equal(authenticate('0000'), null);
    assert.equal(authenticate(''), null);
  });
});

describe('signToken / verifyToken', () => {
  it('round-trips a user token', () => {
    const token = signToken('user');
    const decoded = verifyToken(token);
    assert.equal(decoded.role, 'user');
  });

  it('round-trips an admin token', () => {
    const token = signToken('admin');
    const decoded = verifyToken(token);
    assert.equal(decoded.role, 'admin');
  });

  it('rejects a tampered token', () => {
    const token = signToken('user');
    assert.throws(() => verifyToken(token + 'x'), { name: 'JsonWebTokenError' });
  });

  it('token contains iat and exp', () => {
    const token = signToken('user');
    const decoded = verifyToken(token);
    assert.ok(decoded.iat);
    assert.ok(decoded.exp);
    // 30 day expiry
    assert.equal(decoded.exp - decoded.iat, 30 * 24 * 60 * 60);
  });
});

describe('authorize (API Gateway authorizer)', () => {
  const methodArn = 'arn:aws:execute-api:us-east-2:123456789:abc123/api/GET/state';

  it('returns Allow policy for valid token', async () => {
    const token = signToken('user');
    const result = await authorize({
      authorizationToken: `Bearer ${token}`,
      methodArn,
    });
    assert.equal(result.principalId, 'user');
    assert.equal(result.policyDocument.Statement[0].Effect, 'Allow');
    assert.equal(result.context.role, 'user');
  });

  it('returns wildcard resource ARN for caching', async () => {
    const token = signToken('admin');
    const result = await authorize({
      authorizationToken: `Bearer ${token}`,
      methodArn,
    });
    assert.ok(result.policyDocument.Statement[0].Resource.endsWith('/*/*'));
  });

  it('throws Unauthorized for missing token', async () => {
    await assert.rejects(
      authorize({ authorizationToken: '', methodArn }),
      { message: 'Unauthorized' }
    );
  });

  it('throws Unauthorized for invalid token', async () => {
    await assert.rejects(
      authorize({ authorizationToken: 'Bearer invalid.token.here', methodArn }),
      { message: 'Unauthorized' }
    );
  });
});
