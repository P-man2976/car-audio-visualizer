/**
 * idbStorage.ts — atomWithIDB とストレージファクトリのテスト
 *
 * idb-keyval をモックして IDB アクセスを排除し、
 * ストレージアダプタのロジック（strip/復元/マイグレーション）を検証する。
 */
import { describe, expect, test, vi, beforeEach } from "vitest";

// idb-keyval をモック
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
vi.mock("idb-keyval", () => ({
	createStore: vi.fn(() => "mock-store"),
	get: (...args: unknown[]) => mockGet(...args),
	set: (...args: unknown[]) => mockSet(...args),
	del: (...args: unknown[]) => mockDel(...args),
}));

import {
	atomWithIDB,
	createDirectoryHandleArrayStorage,
	createSongArrayStorage,
	createSongStorage,
} from "@/lib/idbStorage";
import type { Song } from "@/types/player";

beforeEach(() => {
	mockGet.mockReset();
	mockSet.mockReset();
	mockDel.mockReset();
});

const fakeSong: Song = {
	id: "test-id",
	filename: "test.mp3",
	url: "blob:http://localhost/abc",
	title: "Test Song",
	track: { no: 1, of: 10 },
	album: "Test Album",
	artists: ["Artist"],
	genre: ["Pop"],
	date: "2024",
	year: 2024,
	duration: 180,
	artwork: "blob:http://localhost/cover",
};

describe("createSongStorage", () => {
	const storage = createSongStorage();

	test("getItem — IDB に値がある場合はそれを返す", async () => {
		const stored = { ...fakeSong, url: undefined, artwork: undefined };
		mockGet.mockResolvedValueOnce(stored);

		const result = await storage.getItem("key", null);
		expect(result).toEqual(stored);
	});

	test("getItem — IDB に値がない場合は initialValue を返す", async () => {
		mockGet.mockResolvedValueOnce(undefined);

		const result = await storage.getItem("key", null);
		expect(result).toBeNull();
	});

	test("setItem — url と artwork を除去して保存する", async () => {
		mockSet.mockResolvedValueOnce(undefined);

		await storage.setItem("key", fakeSong);

		expect(mockSet).toHaveBeenCalledOnce();
		const [, savedValue] = mockSet.mock.calls[0];
		expect(savedValue).not.toHaveProperty("url");
		expect(savedValue).not.toHaveProperty("artwork");
		expect(savedValue.id).toBe("test-id");
		expect(savedValue.title).toBe("Test Song");
	});

	test("setItem — null を保存できる", async () => {
		mockSet.mockResolvedValueOnce(undefined);

		await storage.setItem("key", null);

		expect(mockSet).toHaveBeenCalledOnce();
		const [, savedValue] = mockSet.mock.calls[0];
		expect(savedValue).toBeNull();
	});

	test("removeItem — del を呼ぶ", async () => {
		mockDel.mockResolvedValueOnce(undefined);

		await storage.removeItem("key");

		expect(mockDel).toHaveBeenCalledOnce();
	});
});

describe("createSongArrayStorage", () => {
	const storage = createSongArrayStorage();

	test("getItem — IDB に配列がある場合はそれを返す", async () => {
		mockGet.mockResolvedValueOnce([{ id: "1" }, { id: "2" }]);

		const result = await storage.getItem("key", []);
		expect(result).toHaveLength(2);
	});

	test("getItem — IDB に値がない場合は initialValue を返す", async () => {
		mockGet.mockResolvedValueOnce(undefined);

		const result = await storage.getItem("key", []);
		expect(result).toEqual([]);
	});

	test("setItem — 各要素から url と artwork を除去して保存する", async () => {
		mockSet.mockResolvedValueOnce(undefined);

		await storage.setItem("key", [fakeSong, { ...fakeSong, id: "2" }]);

		const [, savedValue] = mockSet.mock.calls[0];
		expect(savedValue).toHaveLength(2);
		for (const item of savedValue) {
			expect(item).not.toHaveProperty("url");
			expect(item).not.toHaveProperty("artwork");
		}
	});
});

describe("createDirectoryHandleArrayStorage", () => {
	const storage = createDirectoryHandleArrayStorage();

	test("getItem — IDB に配列がある場合はそれを返す", async () => {
		const handles = [{ name: "dir1" }, { name: "dir2" }];
		mockGet.mockResolvedValueOnce(handles);

		const result = await storage.getItem("key", []);
		expect(result).toHaveLength(2);
	});

	test("getItem — レガシーキーからマイグレーションする", async () => {
		// 新キーには値なし
		mockGet.mockResolvedValueOnce(undefined);
		// レガシーキー (cav-dir-handle-v1) に単一ハンドルあり
		const legacy = { name: "legacy-dir" };
		mockGet.mockResolvedValueOnce(legacy);
		mockSet.mockResolvedValueOnce(undefined);
		mockDel.mockResolvedValueOnce(undefined);

		const result = await storage.getItem("key", []);

		expect(result).toEqual([legacy]);
		// 新キーに書き戻し
		expect(mockSet).toHaveBeenCalledOnce();
		// レガシーキーを削除
		expect(mockDel).toHaveBeenCalledOnce();
	});

	test("getItem — レガシーもない場合は initialValue を返す", async () => {
		mockGet.mockResolvedValueOnce(undefined); // 新キー
		mockGet.mockResolvedValueOnce(null); // レガシー (falsy)

		const result = await storage.getItem("key", []);
		expect(result).toEqual([]);
	});
});

describe("atomWithIDB", () => {
	test("IDB storage インターフェースに準拠したファクトリで atom を生成できる", () => {
		const mockStorage = {
			getItem: vi.fn().mockResolvedValue("stored-value"),
			setItem: vi.fn().mockResolvedValue(undefined),
			removeItem: vi.fn().mockResolvedValue(undefined),
		};

		const result = atomWithIDB("test-key", "default", mockStorage);
		// atom オブジェクトであること
		expect(result).toBeDefined();
		expect(result.read).toBeDefined();
		expect(result.write).toBeDefined();
	});
});
