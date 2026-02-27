// oxlint-disable no-console
/**
 * 大規模シードデータ生成スクリプト
 *
 * 実運用テスト用のリアルなデータを生成します。
 * 使い方: pnpm seed:large
 */
import crypto from "node:crypto";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema";

// ---------------------------------------------------------------------------
// DB接続（drizzle.config.ts と同じ方式）
// ---------------------------------------------------------------------------
function durableObjectNamespaceIdFromName(uniqueKey: string, name: string) {
  const key = crypto.createHash("sha256").update(uniqueKey).digest();
  const nameHmac = crypto.createHmac("sha256", key).update(name).digest().subarray(0, 16);
  const hmac = crypto.createHmac("sha256", key).update(nameHmac).digest().subarray(0, 16);
  return Buffer.concat([nameHmac, hmac]).toString("hex");
}

const PERSIST = ".wrangler/state/v3/d1";
const UNIQUE_KEY = "miniflare-D1DatabaseObject";
const PREVIEW_ID = "DB";
const dbPath = `${PERSIST}/${UNIQUE_KEY}/${durableObjectNamespaceIdFromName(UNIQUE_KEY, PREVIEW_ID)}.sqlite`;

const client = createClient({ url: `file:${dbPath}` });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------
function uid() {
  return crypto.randomUUID();
}

/** 過去 N 日以内のランダムなタイムスタンプ（Date） */
function randomDate(daysAgo: number): Date {
  const now = Date.now();
  return new Date(now - Math.floor(Math.random() * daysAgo * 86_400_000));
}

/** base より後のランダムなタイムスタンプ（base + 0〜hoursLater 時間） */
function dateAfter(base: Date, hoursLater: number): Date {
  return new Date(base.getTime() + Math.floor(Math.random() * hoursLater * 3_600_000));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ---------------------------------------------------------------------------
// テストデータ定義
// ---------------------------------------------------------------------------
const LAST_NAMES = [
  "佐藤",
  "鈴木",
  "高橋",
  "田中",
  "伊藤",
  "渡辺",
  "山本",
  "中村",
  "小林",
  "加藤",
  "吉田",
  "山田",
  "松本",
  "井上",
  "木村",
  "林",
  "斎藤",
  "清水",
  "山崎",
  "阿部",
];

const FIRST_NAMES = [
  "太郎",
  "花子",
  "翔太",
  "美咲",
  "大輝",
  "陽菜",
  "蓮",
  "結衣",
  "悠真",
  "さくら",
  "陸",
  "凛",
  "大翔",
  "葵",
  "湊",
  "楓",
  "颯太",
  "莉子",
  "新",
  "芽依",
];

const TAG_NAMES = [
  "模擬店",
  "ステージ",
  "展示",
  "体験",
  "飲食",
  "物販",
  "音楽",
  "ダンス",
  "スポーツ",
  "学術",
];

const BUILDINGS = [
  { name: "1号館", rooms: ["101", "102", "103", "104"] },
  { name: "2号館", rooms: ["201", "202", "203"] },
  { name: "3号館", rooms: ["301", "302", "303", "304"] },
  { name: "体育館", rooms: ["アリーナ", "サブアリーナ", "ステージ"] },
  { name: "屋外エリア", rooms: ["中庭", "正門前広場", "グラウンド", "駐車場"] },
];

const ORG_TEMPLATES = [
  // サークル系
  "映画研究会",
  "写真部",
  "茶道部",
  "書道部",
  "華道部",
  "演劇部",
  "漫画研究会",
  "アニメーション研究会",
  "文芸部",
  "美術部",
  "吹奏楽部",
  "軽音楽部",
  "アカペラサークル",
  "ジャズ研究会",
  "合唱団",
  "ダンスサークル BEAT",
  "ヒップホップサークル",
  "バレエサークル",
  "よさこいサークル 雅",
  "和太鼓サークル 鼓動",
  // 学術系
  "プログラミングサークル",
  "ロボット研究会",
  "数学研究会",
  "物理学研究会",
  "化学研究会",
  "生物学研究会",
  "天文研究会",
  "経済学研究会",
  "法律研究会",
  "哲学研究会",
  "英語研究会 ESS",
  "中国語研究会",
  "韓国語サークル",
  "フランス語サークル",
  "ドイツ語研究会",
  // スポーツ系
  "サッカー部",
  "バスケットボール部",
  "バレーボール部",
  "テニス部",
  "バドミントン部",
  "卓球部",
  "野球部",
  "ソフトボール部",
  "陸上競技部",
  "水泳部",
  "剣道部",
  "柔道部",
  "空手道部",
  "弓道部",
  "ラグビー部",
  "ハンドボール部",
  "ラクロス部",
  "フットサルサークル",
  "ボルダリングサークル",
  "マラソンサークル",
  // 趣味・文化系
  "料理研究会",
  "お菓子作りサークル",
  "旅行研究会",
  "鉄道研究会",
  "ボードゲーム研究会",
  "eスポーツサークル",
  "手話サークル",
  "ボランティアサークル",
  "国際交流サークル",
  "環境サークル エコ",
  "防災サークル",
  "心理学サークル",
  "マーケティング研究会",
  "起業サークル",
  "投資研究会",
  // ゼミ・研究室系
  "情報工学ゼミ 山田研",
  "社会学ゼミ 鈴木研",
  "建築デザインゼミ",
  "メディアアートゼミ",
  "教育学ゼミ 佐藤研",
  "国際関係ゼミ",
  "経営戦略ゼミ",
  "環境科学研究室",
  "AI研究室",
  "データサイエンスゼミ",
  "スポーツ科学ゼミ",
  "栄養学研究室",
  "福祉学ゼミ",
  "観光学ゼミ",
  "都市計画研究室",
  // 実行委員会系
  "学園祭実行委員会 企画局",
  "学園祭実行委員会 広報局",
  "学園祭実行委員会 総務局",
  "学園祭実行委員会 装飾局",
  "学園祭実行委員会 模擬店局",
];

const PROJECT_TEMPLATES = [
  // 模擬店
  {
    name: "模擬店『たこ焼き天国』",
    pamphlet:
      "アツアツのたこ焼きを大阪直伝のレシピで提供します！トッピングも豊富にご用意しています。",
  },
  {
    name: "模擬店『クレープワゴン』",
    pamphlet:
      "ふわふわ生地のクレープを目の前で焼き上げます。季節のフルーツたっぷりで映え間違いなし！",
  },
  {
    name: "模擬店『からあげグランプリ』",
    pamphlet:
      "秘伝のタレに漬け込んだジューシーなからあげ。一度食べたらやみつきになること間違いなし！",
  },
  {
    name: "模擬店『焼きそばパラダイス』",
    pamphlet: "鉄板で豪快に焼き上げるソース焼きそば。特製ソースの香りが会場中に広がります。",
  },
  {
    name: "模擬店『タピオカミルクティー』",
    pamphlet: "自家製タピオカと厳選茶葉で作る本格ミルクティー。暑い日にぴったりの一杯です。",
  },
  {
    name: "模擬店『チュロスカフェ』",
    pamphlet: "サクサクのチュロスとチョコレートソースの組み合わせが最高！テイクアウトもOKです。",
  },
  {
    name: "模擬店『おにぎり屋さん』",
    pamphlet: "新潟産コシヒカリを使った手作りおにぎり。具材は10種類以上からお選びいただけます。",
  },
  {
    name: "模擬店『ワッフルハウス』",
    pamphlet: "外はカリッと中はふわっとの焼きたてワッフル。アイスクリームとの相性も抜群です。",
  },
  // ステージ
  {
    name: "ライブステージ vol.1",
    pamphlet: "軽音楽部によるバンドライブ！ポップスからロックまで幅広いジャンルでお届けします。",
  },
  {
    name: "ダンスショーケース 2025",
    pamphlet: "ダンスサークル合同のショーケース公演。ヒップホップ、ジャズ、ブレイクダンスの競演！",
  },
  {
    name: "アカペラコンサート",
    pamphlet:
      "声だけで奏でるハーモニーの世界。J-POPからジャズまで、心に響くアカペラをお届けします。",
  },
  {
    name: "和太鼓演奏会『鼓動』",
    pamphlet: "力強い和太鼓の響きが体育館いっぱいに広がります。迫力の演奏をお楽しみください。",
  },
  {
    name: "よさこいソーラン祭り",
    pamphlet: "色鮮やかな衣装と躍動感あふれる踊り。観客も一緒に楽しめるよさこいステージです。",
  },
  {
    name: "お笑いライブ 2025",
    pamphlet: "学内お笑いサークルによる爆笑ライブ！コント、漫才、ピン芸が目白押しです。",
  },
  {
    name: "吹奏楽部定期演奏会",
    pamphlet: "クラシックからポップスまで。吹奏楽の美しい音色をお楽しみください。",
  },
  {
    name: "合唱団スペシャルステージ",
    pamphlet: "美しいハーモニーで彩る特別ステージ。心温まる楽曲の数々をお届けします。",
  },
  // 展示
  {
    name: "写真展『キャンパスの四季』",
    pamphlet: "部員たちが1年間かけて撮影したキャンパスの四季折々の風景を展示します。",
  },
  {
    name: "美術部作品展",
    pamphlet:
      "油絵、水彩、デジタルアートなど多彩な作品を展示。部員の個性あふれる世界観をご覧ください。",
  },
  {
    name: "漫画研究会 作品展示即売会",
    pamphlet: "オリジナル漫画の展示と同人誌の即売会。新作も多数出展予定です！",
  },
  {
    name: "鉄道研究会 ジオラマ展",
    pamphlet: "精巧に作り込まれた鉄道ジオラマを展示。走行デモンストレーションも実施します。",
  },
  {
    name: "天文研究会 プラネタリウム",
    pamphlet: "手作りプラネタリウムで満天の星空を体験。季節の星座解説もあります。",
  },
  {
    name: "建築デザイン作品展",
    pamphlet: "ゼミ生の設計した建築模型と設計図を展示。未来の街づくりを提案します。",
  },
  {
    name: "AI研究室 デモ展示",
    pamphlet: "最新のAI技術を使ったインタラクティブなデモを体験できます。画像生成AIも！",
  },
  {
    name: "環境サークル エコ活動報告展",
    pamphlet: "1年間の環境保全活動の成果を写真とパネルで紹介。エコグッズの配布もあります。",
  },
  // 体験
  {
    name: "茶道体験教室",
    pamphlet: "本格的な茶室で抹茶とお菓子をお楽しみいただけます。初めての方も大歓迎です。",
  },
  {
    name: "書道パフォーマンス",
    pamphlet: "大きな紙に墨で描く迫力の書道パフォーマンス。体験コーナーもあります。",
  },
  {
    name: "プログラミング体験教室",
    pamphlet:
      "プログラミング初心者向けの体験教室。ゲーム作りを通じてプログラミングの楽しさを体験！",
  },
  {
    name: "ボードゲームカフェ",
    pamphlet: "世界中のボードゲームを自由に遊べるカフェスペース。スタッフがルール説明します。",
  },
  {
    name: "eスポーツ大会",
    pamphlet: "人気ゲームのトーナメント大会を開催！観戦だけでも楽しめます。",
  },
  {
    name: "手話体験ワークショップ",
    pamphlet: "日常で使える手話を楽しく学べるワークショップ。自己紹介ができるようになります。",
  },
  {
    name: "ヨガ・ピラティス体験",
    pamphlet:
      "リラックスできるヨガと体幹を鍛えるピラティスを体験。動きやすい服装でお越しください。",
  },
  {
    name: "ボルダリング体験会",
    pamphlet: "初心者でも安心のボルダリング体験。シューズ貸出あり。気軽にチャレンジしてみよう！",
  },
  // 学術
  {
    name: "経済学ゼミ 研究発表会",
    pamphlet: "現代社会の経済課題についてゼミ生が研究成果を発表します。質疑応答もあります。",
  },
  {
    name: "社会調査報告『Z世代の価値観』",
    pamphlet: "Z世代の消費行動と価値観について独自調査した結果を報告します。",
  },
  {
    name: "国際関係シンポジウム",
    pamphlet: "グローバル社会の課題について学生と教員がディスカッション。来場者の参加も歓迎です。",
  },
  {
    name: "データサイエンス成果発表",
    pamphlet: "ビッグデータ分析の実践的な研究成果をデモを交えて発表します。",
  },
  {
    name: "教育フォーラム 2025",
    pamphlet: "教育学ゼミによる教育の未来についてのフォーラム。パネルディスカッション形式です。",
  },
  // その他
  {
    name: "フリーマーケット",
    pamphlet: "学生による不用品のフリーマーケット。掘り出し物が見つかるかも！",
  },
  {
    name: "スタンプラリー",
    pamphlet: "キャンパス内を巡るスタンプラリー。全スタンプ集めた方にはプレゼントをご用意！",
  },
  {
    name: "花道展示『秋の彩り』",
    pamphlet: "華道部による秋をテーマにした生け花展示。日本の伝統美をお楽しみください。",
  },
  {
    name: "国際交流カフェ",
    pamphlet: "留学生と日本語・英語でおしゃべりできるカフェ。異文化交流を楽しみましょう。",
  },
  {
    name: "子ども向け科学実験教室",
    pamphlet: "小学生向けの楽しい科学実験教室。身近な材料で不思議な実験を体験できます。",
  },
  {
    name: "防災体験ブース",
    pamphlet: "地震体験や消火器訓練など、楽しみながら防災を学べるブースです。",
  },
  {
    name: "献血推進キャンペーン",
    pamphlet: "赤十字と協力した献血活動。献血にご協力いただいた方にはオリジナルグッズを進呈。",
  },
  {
    name: "映画上映会『名作セレクション』",
    pamphlet: "映画研究会がセレクトした名作映画を大スクリーンで上映。入退場自由です。",
  },
];

const RETURN_MESSAGES = [
  "パンフレットテキストの内容をもう少し具体的にしてください。",
  "場所の確認が取れていません。場所を再度確認の上、再提出をお願いします。",
  "タグの選択が不適切です。適切なカテゴリタグを選択してください。",
  "企画内容の安全面についての記載が不足しています。安全対策を追記してください。",
  "他の企画と内容が重複している可能性があります。確認の上、差別化をお願いします。",
  "予算計画の記載がありません。概算でよいので追記してください。",
  "実施時間帯が未定です。希望時間帯を記載して再提出してください。",
  "必要な備品リストが不足しています。追記をお願いします。",
];

const APPROVE_MESSAGES = [
  "内容を確認しました。問題ありません。",
  "確認OK。承認します。",
  "内容に問題なし。承認しました。",
  "企画内容を確認し承認しました。当日よろしくお願いします。",
  "",
  "",
  "",
];

const GENERAL_MESSAGES = [
  "よろしくお願いします。",
  "当日の準備について後日連絡します。",
  "搬入時間は別途お知らせします。",
  "確認お願いいたします。",
  "修正しました。ご確認ください。",
];

// ---------------------------------------------------------------------------
// データ生成
// ---------------------------------------------------------------------------
async function main() {
  console.log("大規模シードデータを生成します...");
  console.log(`DB: ${dbPath}`);

  // ------ 既存データクリア ------
  console.log("既存データをクリア中...");
  await db.delete(schema.submissionMessages);
  await db.delete(schema.submissionActions);
  await db.delete(schema.projectPublishedTags);
  await db.delete(schema.projectSubmissionTags);
  await db.delete(schema.projectDraftTags);
  await db.delete(schema.projectPublished);
  await db.delete(schema.projectSubmissions);
  await db.delete(schema.projectDrafts);
  await db.delete(schema.projects);
  await db.delete(schema.orgMembers);
  await db.delete(schema.organizations);
  await db.delete(schema.committeeRoles);
  await db.delete(schema.deadlines);
  await db.delete(schema.places);
  await db.delete(schema.tags);
  await db.delete(schema.events);
  await db.delete(schema.session);
  await db.delete(schema.account);
  await db.delete(schema.verification);
  await db.delete(schema.user);

  // ------ ユーザー (100名) ------
  console.log("ユーザーを生成中...");
  const users: Array<{ id: string; name: string; email: string }> = [];
  for (let i = 1; i <= 100; i++) {
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const firstName = FIRST_NAMES[Math.floor(i / LAST_NAMES.length) % FIRST_NAMES.length];
    const padded = String(i).padStart(3, "0");
    users.push({
      id: `user_${padded}`,
      name: `${lastName}${firstName}`,
      email: `user${padded}@toyo.jp`,
    });
  }

  const baseTime = new Date("2025-04-01T00:00:00Z");

  await db.insert(schema.user).values(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      image: null,
      createdAt: baseTime,
      updatedAt: baseTime,
    })),
  );

  // ------ イベント (1つ) ------
  console.log("イベントを生成中...");
  const eventId = "event_2025";
  await db.insert(schema.events).values({
    id: eventId,
    name: "東洋大学祭2025",
    slug: "2025",
    status: "active",
    createdAt: baseTime,
    updatedAt: baseTime,
  });

  // ------ タグ (10個) ------
  console.log("タグを生成中...");
  const tagIds: string[] = [];
  for (let i = 0; i < TAG_NAMES.length; i++) {
    const id = `tag_${String(i + 1).padStart(3, "0")}`;
    tagIds.push(id);
  }
  await db.insert(schema.tags).values(
    TAG_NAMES.map((name, i) => ({
      id: tagIds[i],
      eventId,
      name,
      createdAt: baseTime,
    })),
  );

  // ------ 場所 (階層構造) ------
  console.log("場所を生成中...");
  const allPlaceIds: string[] = [];

  // 建物（親）
  const buildingInserts = BUILDINGS.map((b, i) => {
    const id = `place_building_${i + 1}`;
    return { id, eventId, name: b.name, parentId: null, createdAt: baseTime };
  });
  await db.insert(schema.places).values(buildingInserts);

  // 部屋（子）
  const roomInserts: Array<{
    id: string;
    eventId: string;
    name: string;
    parentId: string;
    createdAt: Date;
  }> = [];
  for (let bi = 0; bi < BUILDINGS.length; bi++) {
    const building = BUILDINGS[bi];
    const parentId = `place_building_${bi + 1}`;
    for (let ri = 0; ri < building.rooms.length; ri++) {
      const id = `place_${bi + 1}_room_${ri + 1}`;
      allPlaceIds.push(id);
      roomInserts.push({
        id,
        eventId,
        name: building.rooms[ri],
        parentId,
        createdAt: baseTime,
      });
    }
  }
  await db.insert(schema.places).values(roomInserts);

  // ------ 締切 (3つ) ------
  console.log("締切を生成中...");
  const deadlineFields = [
    { key: "pamphlet_text", date: new Date("2025-09-30T23:59:59Z") },
    { key: "web_content", date: new Date("2025-10-15T23:59:59Z") },
    { key: "tags", date: new Date("2025-09-30T23:59:59Z") },
  ];
  await db.insert(schema.deadlines).values(
    deadlineFields.map((d, i) => ({
      id: `deadline_${i + 1}`,
      eventId,
      fieldKey: d.key,
      deadlineAt: d.date,
      createdAt: baseTime,
    })),
  );

  // ------ 委員会役割 (10名) ------
  console.log("委員会役割を生成中...");
  const committeeUsers = users.slice(0, 10);
  const committeeRoleMap: Array<"admin" | "approver" | "member"> = [
    "admin",
    "admin",
    "approver",
    "approver",
    "approver",
    "approver",
    "approver",
    "member",
    "member",
    "member",
  ];
  await db.insert(schema.committeeRoles).values(
    committeeUsers.map((u, i) => ({
      id: `committee_${String(i + 1).padStart(3, "0")}`,
      eventId,
      userId: u.id,
      role: committeeRoleMap[i],
      createdAt: baseTime,
    })),
  );

  // admin/approverのユーザーID（承認に使う）
  const approverUserIds = committeeUsers
    .filter((_, i) => committeeRoleMap[i] === "admin" || committeeRoleMap[i] === "approver")
    .map((u) => u.id);

  // ------ 団体 (100団体) ------
  console.log("団体を生成中...");
  const orgIds: string[] = [];
  // 団体メンバー用にユーザーを割り当て（委員会メンバー以外のユーザー 10〜99）
  const memberPool = users.slice(10);

  const orgInserts: Array<{
    id: string;
    eventId: string;
    name: string;
    description: string;
    logoImageId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const orgMemberInserts: Array<{
    id: string;
    orgId: string;
    userId: string;
    role: "manager" | "editor";
    createdAt: Date;
  }> = [];

  let memberIdx = 0;
  for (let i = 0; i < 100; i++) {
    const orgId = `org_${String(i + 1).padStart(3, "0")}`;
    orgIds.push(orgId);

    orgInserts.push({
      id: orgId,
      eventId,
      name: ORG_TEMPLATES[i % ORG_TEMPLATES.length],
      description: `${ORG_TEMPLATES[i % ORG_TEMPLATES.length]}の活動紹介`,
      logoImageId: null,
      createdAt: baseTime,
      updatedAt: baseTime,
    });

    // メンバー割り当て（2〜4人）
    const memberCount = 2 + Math.floor(Math.random() * 3);
    for (let m = 0; m < memberCount; m++) {
      const userId = memberPool[memberIdx % memberPool.length].id;
      memberIdx++;
      orgMemberInserts.push({
        id: `orgmem_${String(orgMemberInserts.length + 1).padStart(4, "0")}`,
        orgId,
        userId,
        role: m === 0 ? "manager" : "editor",
        createdAt: baseTime,
      });
    }
  }

  // バッチ挿入
  for (let i = 0; i < orgInserts.length; i += 50) {
    await db.insert(schema.organizations).values(orgInserts.slice(i, i + 50));
  }
  for (let i = 0; i < orgMemberInserts.length; i += 50) {
    await db.insert(schema.orgMembers).values(orgMemberInserts.slice(i, i + 50));
  }

  // ------ プロジェクト (200件) ------
  console.log("プロジェクトを生成中...");

  // 状態分布: draft=40, submitted=40, returned=20, approved=80, withdrawn=20
  type ProjectState = "draft" | "submitted" | "returned" | "approved" | "withdrawn";
  const stateDistribution: ProjectState[] = [
    ...Array(40).fill("draft" as const),
    ...Array(40).fill("submitted" as const),
    ...Array(20).fill("returned" as const),
    ...Array(80).fill("approved" as const),
    ...Array(20).fill("withdrawn" as const),
  ];

  // シャッフル
  stateDistribution.sort(() => Math.random() - 0.5);

  // 各団体に1〜3プロジェクト割当
  const projectAssignments: Array<{ orgIdx: number; state: ProjectState }> = [];
  let stateIdx = 0;
  const orgProjectCounts: number[] = new Array(100).fill(0);

  // まず各団体に最低1つ
  for (let i = 0; i < 100 && stateIdx < 200; i++) {
    projectAssignments.push({ orgIdx: i, state: stateDistribution[stateIdx++] });
    orgProjectCounts[i]++;
  }
  // 残り100件をランダムに割当
  while (stateIdx < 200) {
    const orgIdx = Math.floor(Math.random() * 100);
    if (orgProjectCounts[orgIdx] < 3) {
      projectAssignments.push({ orgIdx, state: stateDistribution[stateIdx++] });
      orgProjectCounts[orgIdx]++;
    }
  }

  // プロジェクト、下書き、提出、公開のデータを一括生成
  const projectInserts: Array<{
    id: string;
    eventId: string;
    orgId: string;
    name: string;
    placeId: string | null;
    logoImageId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const draftInserts: Array<{
    projectId: string;
    pamphletText: string;
    webContentJson: null;
    updatedAt: Date;
    updatedBy: string;
  }> = [];
  const draftTagInserts: Array<{
    id: string;
    projectId: string;
    tagId: string;
  }> = [];
  const submissionInserts: Array<{
    id: string;
    projectId: string;
    status: "submitted" | "returned" | "approved" | "withdrawn";
    pamphletText: string;
    webContentJson: null;
    submittedAt: Date;
    submittedBy: string;
  }> = [];
  const submissionTagInserts: Array<{
    id: string;
    submissionId: string;
    tagId: string;
  }> = [];
  const actionInserts: Array<{
    id: string;
    submissionId: string;
    actionType: "submitted" | "approved" | "returned" | "withdrawn";
    userId: string;
    createdAt: Date;
  }> = [];
  const messageInserts: Array<{
    id: string;
    submissionId: string;
    actionId: string | null;
    userId: string;
    message: string;
    createdAt: Date;
  }> = [];
  const publishedInserts: Array<{
    projectId: string;
    pamphletText: string;
    webContentJson: null;
    publishedAt: Date;
    publishedBy: string;
  }> = [];
  const publishedTagInserts: Array<{
    id: string;
    projectId: string;
    tagId: string;
  }> = [];

  for (let pi = 0; pi < projectAssignments.length; pi++) {
    const { orgIdx, state } = projectAssignments[pi];
    const padded = String(pi + 1).padStart(3, "0");
    const projectId = `proj_${padded}`;
    const orgId = orgIds[orgIdx];
    const template = PROJECT_TEMPLATES[pi % PROJECT_TEMPLATES.length];
    const createdAt = randomDate(30);
    const placeId = pick(allPlaceIds);

    // 団体のメンバーからsubmittedBy等を取得
    const orgMems = orgMemberInserts.filter((m) => m.orgId === orgId);
    const managerUserId = orgMems.find((m) => m.role === "manager")?.userId ?? orgMems[0].userId;

    // タグ（1〜3個ランダム）
    const projectTags = pickN(tagIds, 1 + Math.floor(Math.random() * 3));

    projectInserts.push({
      id: projectId,
      eventId,
      orgId,
      name: template.name,
      placeId,
      logoImageId: null,
      createdAt,
      updatedAt: createdAt,
    });

    draftInserts.push({
      projectId,
      pamphletText: template.pamphlet,
      webContentJson: null,
      updatedAt: createdAt,
      updatedBy: managerUserId,
    });

    for (const tagId of projectTags) {
      draftTagInserts.push({
        id: uid(),
        projectId,
        tagId,
      });
    }

    // 提出が必要な状態
    if (state !== "draft") {
      const submissionId = `sub_${padded}`;
      const submittedAt = dateAfter(createdAt, 48);

      submissionInserts.push({
        id: submissionId,
        projectId,
        status: state as "submitted" | "returned" | "approved" | "withdrawn",
        pamphletText: template.pamphlet,
        webContentJson: null,
        submittedAt,
        submittedBy: managerUserId,
      });

      for (const tagId of projectTags) {
        submissionTagInserts.push({
          id: uid(),
          submissionId,
          tagId,
        });
      }

      // submitted アクション（全提出に共通）
      const submittedActionId = `action_sub_${padded}`;
      actionInserts.push({
        id: submittedActionId,
        submissionId,
        actionType: "submitted",
        userId: managerUserId,
        createdAt: submittedAt,
      });

      // 提出時メッセージ（50%の確率）
      if (Math.random() > 0.5) {
        messageInserts.push({
          id: uid(),
          submissionId,
          actionId: submittedActionId,
          userId: managerUserId,
          message: pick(GENERAL_MESSAGES),
          createdAt: submittedAt,
        });
      }

      if (state === "approved") {
        const approverUserId = pick(approverUserIds);
        const approvedAt = dateAfter(submittedAt, 72);
        const approveActionId = `action_appr_${padded}`;

        actionInserts.push({
          id: approveActionId,
          submissionId,
          actionType: "approved",
          userId: approverUserId,
          createdAt: approvedAt,
        });

        // 承認メッセージ（70%の確率）
        const msg = pick(APPROVE_MESSAGES);
        if (msg) {
          messageInserts.push({
            id: uid(),
            submissionId,
            actionId: approveActionId,
            userId: approverUserId,
            message: msg,
            createdAt: approvedAt,
          });
        }

        // Published
        publishedInserts.push({
          projectId,
          pamphletText: template.pamphlet,
          webContentJson: null,
          publishedAt: approvedAt,
          publishedBy: approverUserId,
        });

        for (const tagId of projectTags) {
          publishedTagInserts.push({
            id: uid(),
            projectId,
            tagId,
          });
        }
      } else if (state === "returned") {
        const approverUserId = pick(approverUserIds);
        const returnedAt = dateAfter(submittedAt, 48);
        const returnActionId = `action_ret_${padded}`;

        actionInserts.push({
          id: returnActionId,
          submissionId,
          actionType: "returned",
          userId: approverUserId,
          createdAt: returnedAt,
        });

        // 差し戻しメッセージ（常にあり）
        messageInserts.push({
          id: uid(),
          submissionId,
          actionId: returnActionId,
          userId: approverUserId,
          message: pick(RETURN_MESSAGES),
          createdAt: returnedAt,
        });
      } else if (state === "withdrawn") {
        const withdrawnAt = dateAfter(submittedAt, 24);
        const withdrawActionId = `action_wd_${padded}`;

        actionInserts.push({
          id: withdrawActionId,
          submissionId,
          actionType: "withdrawn",
          userId: managerUserId,
          createdAt: withdrawnAt,
        });
      }
      // state === "submitted" の場合は submittedアクションのみ（追加アクションなし）
    }
  }

  // ------ バッチ挿入 ------
  console.log("プロジェクトデータを挿入中...");
  const BATCH = 50;

  for (let i = 0; i < projectInserts.length; i += BATCH) {
    await db.insert(schema.projects).values(projectInserts.slice(i, i + BATCH));
  }
  for (let i = 0; i < draftInserts.length; i += BATCH) {
    await db.insert(schema.projectDrafts).values(draftInserts.slice(i, i + BATCH));
  }
  if (draftTagInserts.length > 0) {
    for (let i = 0; i < draftTagInserts.length; i += BATCH) {
      await db.insert(schema.projectDraftTags).values(draftTagInserts.slice(i, i + BATCH));
    }
  }

  console.log("提出データを挿入中...");
  if (submissionInserts.length > 0) {
    for (let i = 0; i < submissionInserts.length; i += BATCH) {
      await db.insert(schema.projectSubmissions).values(submissionInserts.slice(i, i + BATCH));
    }
  }
  if (submissionTagInserts.length > 0) {
    for (let i = 0; i < submissionTagInserts.length; i += BATCH) {
      await db
        .insert(schema.projectSubmissionTags)
        .values(submissionTagInserts.slice(i, i + BATCH));
    }
  }
  if (actionInserts.length > 0) {
    for (let i = 0; i < actionInserts.length; i += BATCH) {
      await db.insert(schema.submissionActions).values(actionInserts.slice(i, i + BATCH));
    }
  }
  if (messageInserts.length > 0) {
    for (let i = 0; i < messageInserts.length; i += BATCH) {
      await db.insert(schema.submissionMessages).values(messageInserts.slice(i, i + BATCH));
    }
  }

  console.log("公開用データを挿入中...");
  if (publishedInserts.length > 0) {
    for (let i = 0; i < publishedInserts.length; i += BATCH) {
      await db.insert(schema.projectPublished).values(publishedInserts.slice(i, i + BATCH));
    }
  }
  if (publishedTagInserts.length > 0) {
    for (let i = 0; i < publishedTagInserts.length; i += BATCH) {
      await db.insert(schema.projectPublishedTags).values(publishedTagInserts.slice(i, i + BATCH));
    }
  }

  // ------ 完了サマリー ------
  console.log("\n=== シードデータ生成完了 ===");
  console.log(`ユーザー: ${users.length}名`);
  console.log(`イベント: 1`);
  console.log(`タグ: ${TAG_NAMES.length}`);
  console.log(`場所: ${buildingInserts.length}棟 + ${roomInserts.length}室`);
  console.log(`締切: ${deadlineFields.length}`);
  console.log(`委員会役割: ${committeeUsers.length}`);
  console.log(`団体: ${orgInserts.length}`);
  console.log(`団体メンバー: ${orgMemberInserts.length}`);
  console.log(`プロジェクト: ${projectInserts.length}`);
  console.log(`下書き: ${draftInserts.length}`);
  console.log(`下書きタグ: ${draftTagInserts.length}`);
  console.log(`提出: ${submissionInserts.length}`);
  console.log(`提出タグ: ${submissionTagInserts.length}`);
  console.log(`アクション: ${actionInserts.length}`);
  console.log(`メッセージ: ${messageInserts.length}`);
  console.log(`公開: ${publishedInserts.length}`);
  console.log(`公開タグ: ${publishedTagInserts.length}`);
}

main()
  .then(() => {
    console.log("\n完了しました。");
    process.exit(0);
  })
  .catch((err) => {
    console.error("エラーが発生しました:", err);
    process.exit(1);
  });
