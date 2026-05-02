import 'koa';

/** koa-session 挂载后的会话负载（业务字段）。 */
export interface AppSession {
  userId?: number;
  username?: string;
}

declare module 'koa' {
  interface BaseContext {
    session: AppSession | null;
  }
}
