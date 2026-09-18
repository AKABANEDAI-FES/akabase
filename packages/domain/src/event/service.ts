import type { Result } from "@akabase/result";
import type { Event, EventId, PlaceId, ProjectCategoryId, TagId } from "./schema";
import type { EventError } from "./errors";

/**
 * Event Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（EventDomainServiceImpl）
 */
export type EventDomainService = {
  /**
   * スラッグの一意性を保証する
   *
   * @param slug - チェック対象のスラッグ
   * @param excludeEventId - 除外するイベントID（更新時に自身を除外する用途）
   * @returns 一意であれば成功、重複があればSLUG_NOT_UNIQUEエラー
   */
  ensureSlugUnique(
    slug: string,
    excludeEventId?: EventId,
  ): Promise<Result.Result<true, EventError>>;

  /**
   * タグ名の一意性を保証する（イベント内）
   *
   * @param eventId - 対象イベントID
   * @param name - チェック対象のタグ名
   * @param excludeTagId - 除外するタグID（更新時に自身を除外する用途）
   * @returns 一意であれば成功、重複があればTAG_NOT_UNIQUEエラー
   */
  ensureTagNameUnique(
    eventId: EventId,
    name: string,
    excludeTagId?: TagId,
  ): Promise<Result.Result<true, EventError>>;

  /**
   * 企画区分名の一意性を保証する（イベント内）
   *
   * @param eventId - 対象イベントID
   * @param name - チェック対象の企画区分名
   * @param excludeCategoryId - 除外する企画区分ID（更新時に自身を除外する用途）
   * @returns 一意であれば成功、重複があればPROJECT_CATEGORY_NOT_UNIQUEエラー
   */
  ensureProjectCategoryNameUnique(
    eventId: EventId,
    name: string,
    excludeCategoryId?: ProjectCategoryId,
  ): Promise<Result.Result<true, EventError>>;

  /**
   * 企画区分がイベントに属することを保証する
   *
   * @param eventId - 対象イベントID
   * @param categoryId - チェック対象の企画区分ID
   * @returns 属していれば成功、属していなければPROJECT_CATEGORY_NOT_FOUNDエラー
   */
  ensureProjectCategoryInEvent(
    eventId: EventId,
    categoryId: ProjectCategoryId,
  ): Promise<Result.Result<true, EventError>>;

  /**
   * 場所名の一意性を保証する（同一イベント・同一階層内）
   *
   * @param eventId - 対象イベントID
   * @param name - チェック対象の場所名
   * @param parentId - 親場所ID（同じ階層内での一意性チェック）
   * @param excludePlaceId - 除外する場所ID（更新時に自身を除外する用途）
   * @returns 一意であれば成功、重複があればPLACE_NOT_UNIQUEエラー
   */
  ensurePlaceNameUnique(
    eventId: EventId,
    name: string,
    parentId: PlaceId | null,
    excludePlaceId?: PlaceId,
  ): Promise<Result.Result<true, EventError>>;

  /**
   * イベントを取得し、変更可能な状態であることを保証する
   *
   * @param eventId - 対象イベントID
   * @returns イベントエンティティ。見つからない場合はEVENT_NOT_FOUND、アーカイブ済みの場合はEVENT_ARCHIVEDエラー
   */
  resolveModifiableEvent(eventId: EventId): Promise<Result.Result<Event, EventError>>;
};
