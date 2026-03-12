import type { Result, ResultAsync, ResultMaybeAsync } from "./result";

export function suspend<T, E>(fn: () => Result<T, E>): Result<T, E>;
export function suspend<T, E>(fn: () => ResultAsync<T, E>): ResultAsync<T, E>;
export function suspend<T, E>(fn: () => ResultMaybeAsync<T, E>): ResultMaybeAsync<T, E> {
  return fn();
}
