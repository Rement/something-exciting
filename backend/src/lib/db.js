import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME;

function normalizeEvent(item) {
  if (!item) return null;
  return {
    ...item,
    eventId: item.id.replace('event:', ''),
    scratchedTiles: item.scratchedTiles ? [...item.scratchedTiles].sort((a, b) => a - b) : [],
    notifiedTiles: item.notifiedTiles ? [...item.notifiedTiles].sort((a, b) => a - b) : [],
    cards: Array.isArray(item.cards) ? item.cards : [],
  };
}

/* ---- Event CRUD ---- */

export async function getEvent(eventId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
  }));
  return normalizeEvent(Item);
}

export async function saveEvent(eventId, fields) {
  const now = new Date().toISOString();
  const sets = [
    'pin = :pin',
    'recipientName = :recipientName',
    'cards = :cards',
    'updatedAt = :now',
    'createdAt = if_not_exists(createdAt, :now)',
  ];
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeValues: {
      ':pin': fields.pin || '',
      ':recipientName': fields.recipientName || '',
      ':cards': fields.cards || [],
      ':now': now,
    },
  }));
}

export async function deleteEvent(eventId) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
  }));
}

export async function listEvents() {
  const { Items } = await docClient.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'begins_with(id, :prefix)',
    ExpressionAttributeValues: { ':prefix': 'event:' },
  }));
  return (Items || []).map(normalizeEvent);
}

/* ---- PIN mapping ---- */

export async function getEventByPin(pin) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id: `pin:${pin}` },
  }));
  if (!Item) return null;
  return getEvent(Item.eventId);
}

export async function setPinMapping(pin, eventId) {
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: { id: `pin:${pin}`, eventId },
  }));
}

export async function deletePinMapping(pin) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id: `pin:${pin}` },
  }));
}

/* ---- Event state mutations ---- */

export async function scratchTile(eventId, tileIndex) {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
    UpdateExpression:
      'ADD scratchedTiles :tile ' +
      'SET updatedAt = :now, lastScratchAt = :now',
    ExpressionAttributeValues: {
      ':tile': new Set([tileIndex]),
      ':now': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  }));
  return normalizeEvent(Attributes);
}

export async function addNotifiedTiles(eventId, tileIndices) {
  if (!tileIndices.length) return;
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
    UpdateExpression: 'ADD notifiedTiles :tiles SET updatedAt = :now',
    ExpressionAttributeValues: {
      ':tiles': new Set(tileIndices),
      ':now': new Date().toISOString(),
    },
  }));
}

export async function setEventTelegramChatId(eventId, chatId) {
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
    UpdateExpression: 'SET telegramChatId = :c, updatedAt = :now',
    ExpressionAttributeValues: {
      ':c': String(chatId),
      ':now': now,
    },
  }));
}

export async function resetEvent(eventId) {
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: `event:${eventId}` },
    UpdateExpression: 'SET updatedAt = :now REMOVE scratchedTiles, notifiedTiles, lastScratchAt',
    ExpressionAttributeValues: {
      ':now': new Date().toISOString(),
    },
  }));
}
