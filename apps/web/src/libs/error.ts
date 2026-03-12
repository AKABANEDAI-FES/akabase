import { notFound } from "@tanstack/react-router";

export function taggedError<Tag extends string>(tag: Tag) {
  return class extends Error {
    readonly _tag = tag;

    constructor(message?: string) {
      super(message);
      this.name = tag;
    }
  };
}

export class NotFoundError extends taggedError("NotFoundError") {}

export function handleNotFoundError(error: unknown) {
  if (error instanceof NotFoundError) {
    throw notFound();
  }
  throw error;
}
