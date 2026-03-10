import { z } from "zod";

export function cast<T extends string>(id: string): T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return z.string().parse(id) as T;
}
