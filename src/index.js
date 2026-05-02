const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const session = require('koa-session').default;
const bcrypt = require('bcrypt');
const { HttpError } = require('./lib/httpError');
const { requireAuth } = require('./middleware/requireAuth');
const userStore = require('./userStore');

userStore.loadUsers();

const isDev = process.env.NODE_ENV !== 'production';

/**
 * 开发环境请求日志用：绝不输出明文 password。
 * @param {unknown} body
 */
function redactBodyForLog(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const out = { ...body };
  if ('password' in out) out.password = '[REDACTED]';
  return out;
}

/** @type {Map<string, object>} */
const sessionMemory = new Map();

const sessionStore = {
  /**
   * @param {string} key
   * @param {number | string} _maxAge
   * @param {{ ctx: import('koa').Context, rolling?: boolean }} _meta
   */
  async get(key, _maxAge, _meta) {
    return sessionMemory.get(key) ?? null;
  },
  /**
   * @param {string} key
   * @param {object} sess
   * @param {number | string} _maxAge
   */
  async set(key, sess, _maxAge) {
    sessionMemory.set(key, sess);
  },
  /** @param {string} key */
  async destroy(key) {
    sessionMemory.delete(key);
  },
};

const app = new Koa();

app.keys = process.env.SESSION_KEYS
  ? process.env.SESSION_KEYS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['dev-only-change-me'];

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.type = 'application/json';
    if (err instanceof HttpError) {
      ctx.status = err.status;
      ctx.body = { error: err.error, message: err.message };
      return;
    }
    if (err instanceof SyntaxError) {
      ctx.status = 400;
      ctx.body = {
        error: 'INVALID_JSON',
        message: '请求体不是合法 JSON',
      };
      return;
    }
    ctx.status = 500;
    ctx.body = {
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    };
    // 不记录 ctx / request.body，避免意外把密码写入日志
    if (isDev) {
      console.error('[internal]', err.name, err.message);
      if (err.stack) console.error(err.stack);
    } else {
      console.error('[internal]', err.name);
    }
  }
});

app.use(
  bodyParser({
    enableTypes: ['json'],
    jsonLimit: '1mb',
  })
);

if (isDev) {
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    const safe = redactBodyForLog(ctx.request.body);
    const bodyStr =
      safe !== undefined ? ` body=${JSON.stringify(safe)}` : '';
    console.info(
      `[req] ${ctx.method} ${ctx.path} -> ${ctx.status} ${ms}ms${bodyStr}`
    );
  });
}

app.use(
  session(
    {
      key: 'app_session',
      maxAge: 86400000,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      store: sessionStore,
    },
    app
  )
);

const router = new Router();

router.get('/health', (ctx) => {
  ctx.type = 'application/json';
  ctx.body = { ok: true };
});

router.post('/register', async (ctx) => {
  ctx.type = 'application/json';

  const ct = ctx.get('Content-Type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    ctx.status = 415;
    ctx.body = {
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: '请使用 Content-Type: application/json',
    };
    return;
  }

  const body = ctx.request.body;
  const usernameRaw = body && body.username;
  const passwordRaw = body && body.password;

  if (
    typeof usernameRaw !== 'string' ||
    typeof passwordRaw !== 'string' ||
    usernameRaw.trim() === '' ||
    passwordRaw === ''
  ) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'username 与 password 均为必填非空字符串',
    };
    return;
  }

  const username = usernameRaw.trim();
  if (username.length > 128) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'username 长度不能超过 128 个字符',
    };
    return;
  }

  if (passwordRaw.length > 1024) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'password 长度不能超过 1024 个字符',
    };
    return;
  }

  const user = await userStore.registerUser(username, passwordRaw);
  ctx.status = 201;
  ctx.body = { ok: true, user: { id: user.id, username: user.username } };
});

router.post('/login', async (ctx) => {
  ctx.type = 'application/json';

  const ct = ctx.get('Content-Type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    ctx.status = 415;
    ctx.body = {
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: '请使用 Content-Type: application/json',
    };
    return;
  }

  const body = ctx.request.body;
  const usernameRaw = body && body.username;
  const passwordRaw = body && body.password;

  if (
    typeof usernameRaw !== 'string' ||
    typeof passwordRaw !== 'string' ||
    usernameRaw.trim() === '' ||
    passwordRaw === ''
  ) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'username 与 password 均为必填非空字符串',
    };
    return;
  }

  const username = usernameRaw.trim();
  if (username.length > 128) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'username 长度不能超过 128 个字符',
    };
    return;
  }

  if (passwordRaw.length > 1024) {
    ctx.status = 400;
    ctx.body = {
      error: 'VALIDATION_ERROR',
      message: 'password 长度不能超过 1024 个字符',
    };
    return;
  }

  const user = userStore.findUserByUsername(username);
  const passwordOk =
    user && (await bcrypt.compare(passwordRaw, user.passwordHash));
  if (!passwordOk) {
    ctx.status = 401;
    ctx.body = {
      error: 'INVALID_CREDENTIALS',
      message: '用户名或密码错误',
    };
    return;
  }

  ctx.session.userId = user.id;
  ctx.session.username = user.username;

  ctx.status = 200;
  ctx.body = {
    ok: true,
    user: { id: user.id, username: user.username },
  };
});

router.post('/logout', async (ctx) => {
  ctx.type = 'application/json';
  ctx.session = null;
  ctx.status = 200;
  ctx.body = { ok: true };
});

router.get('/me', requireAuth, async (ctx) => {
  ctx.type = 'application/json';
  ctx.body = {
    user: {
      id: ctx.session.userId,
      username: ctx.session.username,
    },
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx) => {
  if (ctx.body != null) return;
  ctx.status = 404;
  ctx.type = 'application/json';
  ctx.body = {
    error: 'NOT_FOUND',
    message: '未找到该资源',
  };
});

const port = Number.parseInt(process.env.PORT, 10) || 4000;

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
