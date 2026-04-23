import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME;

function normalize(item) {
  if (!item) return { id: 'main', scratchedTiles: [], revealed: false };
  return {
    ...item,
    scratchedTiles: item.scratchedTiles ? [...item.scratchedTiles].sort((a, b) => a - b) : [],
  };
}

export async function getState() {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id: 'main' },
  }));
  return normalize(Item);
}

export async function scratchTile(tileIndex) {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: 'main' },
    UpdateExpression:
      'ADD scratchedTiles :tile ' +
      'SET revealed = if_not_exists(revealed, :f), ' +
      'updatedAt = :now, lastScratchAt = :now, ' +
      'createdAt = if_not_exists(createdAt, :now)',
    ExpressionAttributeValues: {
      ':tile': new Set([tileIndex]),
      ':f': false,
      ':now': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  }));
  return normalize(Attributes);
}

export async function setRevealed() {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: 'main' },
    UpdateExpression:
      'SET revealed = :r, updatedAt = :now, ' +
      'createdAt = if_not_exists(createdAt, :now)',
    ExpressionAttributeValues: {
      ':r': true,
      ':now': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  }));
  return normalize(Attributes);
}

export async function resetState() {
  const now = new Date().toISOString();
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: {
      id: 'main',
      revealed: false,
      createdAt: now,
      updatedAt: now,
    },
  }));
  return { id: 'main', scratchedTiles: [], revealed: false, createdAt: now, updatedAt: now };
}
