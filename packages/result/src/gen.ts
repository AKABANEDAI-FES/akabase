// oxlint-disable typescript/no-explicit-any
import { Result } from "@praha/byethrow";

function* fromResult<T, E>(r: Result.Result<T, E>): Generator<Result.Failure<E>, T, unknown> {
  if (Result.isSuccess(r)) {
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

function runSync(it: Generator<Result.Failure<any>, any, unknown>): Result.Result<any, any> {
  const { value, done } = it.next();
  return done ? Result.succeed(value) : value;
}

async function runAsync(
  it: AsyncGenerator<Result.Failure<any>, any, unknown>,
): Promise<Result.Result<any, any>> {
  const { value, done } = await it.next();
  return done ? Result.succeed(value) : value;
}

type YieldOf<G> = G extends MaybeAsyncGenerator<infer Y, any, any> ? Y : never;
type YieldedError<G> = YieldOf<G> extends Result.Failure<infer E> ? E : never;
type ReturnOf<G> = G extends MaybeAsyncGenerator<any, infer R, any> ? R : never;

export function gen<G extends Generator<Result.Failure<any>>>(
  f: ($: typeof fromResult) => G,
): Result.Result<ReturnOf<G>, YieldedError<G>>;
export function gen<G extends AsyncGenerator<Result.Failure<any>>>(
  f: ($: typeof fromResult) => G,
): Result.ResultAsync<ReturnOf<G>, YieldedError<G>>;
export function gen<G extends MaybeAsyncGenerator<Result.Failure<any>, any, any>>(
  f: ($: typeof fromResult) => G,
): Result.ResultMaybeAsync<ReturnOf<G>, YieldedError<G>> {
  const it = f(fromResult);

  if (isAsyncGen(it)) {
    return runAsync(it);
  }

  return runSync(it);
}
