import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
let cached = null;

export async function getSecrets() {
  if (cached) return cached;

  // Env-var fallback for local testing (no Secrets Manager needed)
  if (process.env.JWT_SECRET) {
    cached = {
      userPin: process.env.USER_PIN,
      adminPin: process.env.ADMIN_PIN,
      jwtSecret: process.env.JWT_SECRET,
    };
    return cached;
  }

  const { SecretString } = await client.send(
    new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN })
  );
  cached = JSON.parse(SecretString);
  return cached;
}
