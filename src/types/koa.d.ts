/**
 * Koa Context 扩展：`koa-session` 挂载后的 `ctx.session` 形状（单一类型入口）。
 * 业务代码勿用 any 描述会话；在此集中维护字段。
 */
import 'koa';

export interface AppSession {
  userId?: number;
  username?: string;
}

declare module 'koa' {
  interface BaseContext {
    session: AppSession | null;
  }
}
