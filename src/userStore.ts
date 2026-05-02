import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { HttpError } from './lib/httpError';

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

export interface StoredUser {
  id: number;
  username: string;
  passwordHash: string;
}

let users: StoredUser[] = [];

let writeChain: Promise<void> = Promise.resolve();

/**
 * 将写盘操作串行化，避免并发写同一文件交错。
 */
function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(() => fn());
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function readUsersFromDisk(): void {
  if (!fs.existsSync(USERS_FILE)) {
    users = [];
    return;
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    users = Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    users = [];
  }
}

function nextId(): number {
  if (users.length === 0) return 1;
  return Math.max(...users.map((u) => (typeof u.id === 'number' ? u.id : 0))) + 1;
}

function writeUsersToDisk(): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    const payload = JSON.stringify(users, null, 2);
    fs.writeFile(USERS_FILE, payload, 'utf8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** 进程启动时调用：从 data/users.json 读入；文件不存在则内存为空数组。 */
export function loadUsers(): void {
  readUsersFromDisk();
}

/** 按用户名查找（精确匹配，区分大小写）。 */
export function findUserByUsername(username: string): StoredUser | undefined {
  return users.find((u) => u.username === username);
}

/**
 * 注册并持久化。用户名冲突时抛出 HttpError 409。
 */
export async function registerUser(
  username: string,
  password: string
): Promise<{ id: number; username: string }> {
  const passwordHash = await bcrypt.hash(password, 10);
  return runSerialized(async () => {
    if (users.some((u) => u.username === username)) {
      throw new HttpError(409, 'USERNAME_TAKEN', '该用户名已被注册');
    }
    const id = nextId();
    users.push({ id, username, passwordHash });
    await writeUsersToDisk();
    return { id, username };
  });
}

export { USERS_FILE };
