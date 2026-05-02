const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { HttpError } = require('./lib/httpError');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

/** @type {Array<{ id: number, username: string, passwordHash: string }>} */
let users = [];

/** @type {Promise<void>} */
let writeChain = Promise.resolve();

/**
 * 将写盘操作串行化，避免并发写同一文件交错。
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
function runSerialized(fn) {
  const next = writeChain.then(() => fn());
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function readUsersFromDisk() {
  if (!fs.existsSync(USERS_FILE)) {
    users = [];
    return;
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    users = Array.isArray(parsed) ? parsed : [];
  } catch {
    users = [];
  }
}

function nextId() {
  if (users.length === 0) return 1;
  return Math.max(...users.map((u) => (typeof u.id === 'number' ? u.id : 0))) + 1;
}

function writeUsersToDisk() {
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
function loadUsers() {
  readUsersFromDisk();
}

/**
 * 按用户名查找（精确匹配，区分大小写）。
 * @param {string} username
 * @returns {{ id: number, username: string, passwordHash: string } | undefined}
 */
function findUserByUsername(username) {
  return users.find((u) => u.username === username);
}

/**
 * 注册并持久化。用户名冲突时抛出 HttpError 409。
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ id: number, username: string }>}
 */
async function registerUser(username, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return runSerialized(async () => {
    if (users.some((u) => u.username === username)) {
      throw new HttpError(
        409,
        'USERNAME_TAKEN',
        '该用户名已被注册'
      );
    }
    const id = nextId();
    users.push({ id, username, passwordHash });
    await writeUsersToDisk();
    return { id, username };
  });
}

module.exports = {
  USERS_FILE,
  loadUsers,
  findUserByUsername,
  registerUser,
};
