const { HttpError } = require('../lib/httpError');

/**
 * 要求已登录：依赖上游 `koa-session` 已挂载并解析 Cookie。
 * 未登录或会话缺少用户信息时抛出 401（由全局错误处理中间件序列化为 JSON）。
 */
async function requireAuth(ctx, next) {
  const userId = ctx.session && ctx.session.userId;
  const username = ctx.session && ctx.session.username;
  if (
    userId === undefined ||
    userId === null ||
    typeof username !== 'string' ||
    username === ''
  ) {
    throw new HttpError(401, 'UNAUTHORIZED', '未登录或会话已失效');
  }
  await next();
}

module.exports = { requireAuth };
