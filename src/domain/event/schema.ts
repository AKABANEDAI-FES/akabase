import { z } from "zod";
import type { DeadlineId, EventId, PlaceId, TagId } from "../shared/ids";

/**
 * Event Status
 */
export const eventStatusSchema = z.enum(["active", "archived"]);

export type EventStatus = z.infer<typeof eventStatusSchema>;

/**
 * Event
 * イベント全体の設定を管理
 */
export const eventSchema = z.object({
  id: z.custom<EventId>(),
  name: z.string(),
  slug: z.string(),
  status: eventStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Event = z.infer<typeof eventSchema>;

/**
 * Tag
 * タグマスタ（イベント単位で管理）
 */
export const tagSchema = z.object({
  id: z.custom<TagId>(),
  eventId: z.custom<EventId>(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
});

export type Tag = z.infer<typeof tagSchema>;

/**
 * Place
 * 場所マスタ（イベント単位で管理）
 */
export const placeSchema = z.object({
  id: z.custom<PlaceId>(),
  eventId: z.custom<EventId>(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
});

export type Place = z.infer<typeof placeSchema>;

/**
 * Deadline
 * 締切設定（フィールド単位）
 */
export const deadlineSchema = z.object({
  id: z.custom<DeadlineId>(),
  eventId: z.custom<EventId>(),
  fieldKey: z.string(),
  deadlineAt: z.date(),
  createdAt: z.date(),
});

export type Deadline = z.infer<typeof deadlineSchema>;
