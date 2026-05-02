/** bcrypt@6 未随包提供声明；仅覆盖本仓库用到的 API。 */
declare module 'bcrypt' {
  export function hash(
    data: string | Buffer,
    saltOrRounds: string | number
  ): Promise<string>;
  export function compare(
    data: string | Buffer,
    encrypted: string
  ): Promise<boolean>;
}
