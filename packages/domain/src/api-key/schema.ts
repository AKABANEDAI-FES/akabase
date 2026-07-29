/**
 * API key domain schema
 * Type definitions for API keys used by external clients (e.g. the public festival website)
 */

import { z } from "zod";

export const apiKeyIdSchema = z.string().brand<"ApiKeyId">();
export type ApiKeyId = z.infer<typeof apiKeyIdSchema>;

/**
 * Schema constraints
 */
export const API_KEY_NAME_MIN_LENGTH = 1;
export const API_KEY_NAME_MAX_LENGTH = 100;

export const apiKeyNameSchema = z
  .string()
  .min(API_KEY_NAME_MIN_LENGTH, "APIキー名を入力してください")
  .max(API_KEY_NAME_MAX_LENGTH, "APIキー名は100文字以内で入力してください");
