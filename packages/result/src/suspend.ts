import type { Result } from "@praha/byethrow";

export function suspend<T, E>(fn: () => Result.Result<T, E>): Result.Result<T, E>;
export function suspend<T, E>(fn: () => Result.ResultAsync<T, E>): Result.ResultAsync<T, E>;
export function suspend<T, E>(
  fn: () => Result.ResultMaybeAsync<T, E>,
): Result.ResultMaybeAsync<T, E> {
  return fn();
}
