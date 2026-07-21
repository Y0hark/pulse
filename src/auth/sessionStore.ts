export interface SessionRecord {
  userId: string;
  expiresAt: number; // epoch ms
}

export interface SessionStore {
  set(sessionId: string, record: SessionRecord): Promise<void>;
  get(sessionId: string): Promise<SessionRecord | null>;
  destroy(sessionId: string): Promise<void>;
}

/** Default session store; adequate for a single-process deployment. */
export class InMemorySessionStore implements SessionStore {
  private readonly table = new Map<string, SessionRecord>();

  async set(sessionId: string, record: SessionRecord): Promise<void> {
    this.table.set(sessionId, record);
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const record = this.table.get(sessionId);
    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      this.table.delete(sessionId);
      return null;
    }
    return record;
  }

  async destroy(sessionId: string): Promise<void> {
    this.table.delete(sessionId);
  }
}

/** Used when config.redisUrl is set, so sessions survive across processes/restarts. */
export class RedisSessionStore implements SessionStore {
  constructor(private readonly client: RedisLikeClient) {}

  async set(sessionId: string, record: SessionRecord): Promise<void> {
    const ttlSeconds = Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000));
    await this.client.set(sessionKey(sessionId), JSON.stringify(record), 'EX', ttlSeconds);
  }

  async get(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.client.get(sessionKey(sessionId));
    if (!raw) return null;
    const record = JSON.parse(raw) as SessionRecord;
    if (record.expiresAt < Date.now()) {
      await this.destroy(sessionId);
      return null;
    }
    return record;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.client.del(sessionKey(sessionId));
  }
}

function sessionKey(sessionId: string): string {
  return `pulse:session:${sessionId}`;
}

/** Minimal shape of the ioredis client surface RedisSessionStore relies on. */
export interface RedisLikeClient {
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<unknown>;
}
