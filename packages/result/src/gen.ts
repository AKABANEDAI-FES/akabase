// oxlint-disable typescript/no-explicit-any
import { isSuccess, succeed } from "./result";
import type { Failure, Result, ResultAsync, ResultMaybeAsync } from "./result";

function* fromResult<T, E>(r: Result<T, E>): Generator<Failure<E>, T, unknown> {
  if (isSuccess(r)) {
    return r.value;
  }
  yield r;
  throw new Error("unreachable");
}

type MaybeAsyncGenerator<T, TReturn, TNext> =
  | Generator<T, TReturn, TNext>
  | AsyncGenerator<T, TReturn, TNext>;

function isAsyncGen(x: unknown): x is AsyncGenerator<any> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Boolean(x) && typeof (x as any)[Symbol.asyncIterator] === "function";
}

function runSync(it: Generator<Failure<any>, any, unknown>): Result<any, any> {
  const { value, done } = it.next();
  return done ? succeed(value) : value;
}

async function runAsync(it: AsyncGenerator<Failure<any>, any, unknown>): Promise<Result<any, any>> {
  const { value, done } = await it.next();
  return done ? succeed(value) : value;
}

type YieldOf<G> = G extends MaybeAsyncGenerator<infer Y, any, any> ? Y : never;
type YieldedError<G> = YieldOf<G> extends Failure<infer E> ? E : never;
type ReturnOf<G> = G extends MaybeAsyncGenerator<any, infer R, any> ? R : never;

export function gen<G extends Generator<Failure<any>>>(
  f: ($: typeof fromResult) => G,
): Result<ReturnOf<G>, YieldedError<G>>;
export function gen<G extends AsyncGenerator<Failure<any>>>(
  f: ($: typeof fromResult) => G,
): ResultAsync<ReturnOf<G>, YieldedError<G>>;
export function gen<G extends MaybeAsyncGenerator<Failure<any>, any, any>>(
  f: ($: typeof fromResult) => G,
): ResultMaybeAsync<ReturnOf<G>, YieldedError<G>> {
  const it = f(fromResult);

  if (isAsyncGen(it)) {
    return runAsync(it);
  }

  return runSync(it);
}
