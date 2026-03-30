import { describe, expect, test } from "vite-plus/test";
import {
  computeMobilePartialKey,
  generateMobileDeviceHeaders,
  getAreaCoords,
  getCfCoords,
} from "@/lib/radiko-mobile-auth";

describe("getAreaCoords", () => {
  test("既知のエリア (JP20) の座標文字列を返す", () => {
    const result = getAreaCoords("JP20");
    expect(result).toMatch(/^\d+\.\d+,\d+\.\d+,gps$/);
    // JP20 (長野) は 36.6x, 138.1x 付近
    const [lat, lon] = result.split(",").map(Number);
    expect(lat).toBeGreaterThan(36.6);
    expect(lat).toBeLessThan(36.7);
    expect(lon).toBeGreaterThan(138.1);
    expect(lon).toBeLessThan(138.3);
  });

  test("未知のエリアの場合は JP13 (東京) にフォールバックする", () => {
    const result = getAreaCoords("JP99");
    expect(result).toMatch(/35\.\d+,139\.\d+,gps/);
  });

  test("呼び出しごとに異なるオフセットが付く (ランダム性)", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(getAreaCoords("JP13"));
    }
    // 20 回中すべて同一になる確率は極めて低い
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("getCfCoords", () => {
  test("lat/lon から GPS 座標文字列を生成する", () => {
    const result = getCfCoords(36.651299, 138.180956);
    expect(result).toBe("36.651299,138.180956,gps");
  });
});

describe("generateMobileDeviceHeaders", () => {
  test("必要なヘッダーがすべて含まれている", () => {
    const headers = generateMobileDeviceHeaders();
    expect(headers["X-Radiko-App"]).toBe("aSmartPhone7a");
    expect(headers["X-Radiko-App-Version"]).toBeDefined();
    expect(headers["X-Radiko-Device"]).toMatch(/^\d+\./);
    expect(headers["X-Radiko-User"]).toMatch(/^[0-9a-f]{32}$/);
    expect(headers["User-Agent"]).toMatch(/^Dalvik/);
  });
});

describe("computeMobilePartialKey", () => {
  test("Base64 エンコードされた文字列を返す", () => {
    const result = computeMobilePartialKey(0, 16);
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  test("異なるオフセットで異なる結果を返す", () => {
    const a = computeMobilePartialKey(0, 16);
    const b = computeMobilePartialKey(100, 16);
    expect(a).not.toBe(b);
  });
});
