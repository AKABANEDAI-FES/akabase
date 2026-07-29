import type { Result } from "@akabase/result";
import type { ApiKeyId } from "./schema";
import type { ApiKeyError } from "./errors";
import type { EventId } from "../event/schema";
import type { UserId } from "../user/schema";

/**
 * API Key Domain Service Interface
 * I/Oが必要なビジネスルールを定義する
 * 実装はインフラ層で提供（ApiKeyServiceImpl）
 */
export type ApiKeyService = {
  /**
   * APIキーを発行する
   *
   * 平文のキーはこの戻り値でのみ得られ、以後再取得できない
   *
   * @param input - キー名、対象イベントID、作成者のユーザーID
   * @returns 発行したキーのIDと平文
   */
  create(input: {
    name: string;
    eventId: EventId;
    userId: UserId;
  }): Promise<Result.Result<{ id: ApiKeyId; key: string }, ApiKeyError>>;

  /**
   * APIキーを削除する
   *
   * @param id - 削除対象のキーID
   * @returns 成功、または対象が存在しない場合はAPI_KEY_NOT_FOUNDエラー
   */
  delete(id: ApiKeyId): Promise<Result.Result<true, ApiKeyError>>;
};
