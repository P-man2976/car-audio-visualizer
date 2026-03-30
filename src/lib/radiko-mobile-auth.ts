/**
 * radiko モバイル認証 (aSmartPhone7a) のヘルパー。
 * GPS 座標を使って任意エリアのトークンを取得する。
 */
import { RADIKO_MOBILE_KEY } from "@/lib/radiko-mobile-key";

// ---------------------------------------------------------------------------
// Prefecture 座標マップ (県庁所在地 + ランダムオフセット)
// ---------------------------------------------------------------------------

/** 各エリアの県庁所在地座標 [lat, lon] */
const COORDINATES: Record<string, [number, number]> = {
  JP1: [43.064615, 141.346807],
  JP2: [40.824308, 140.739998],
  JP3: [39.703619, 141.152684],
  JP4: [38.268837, 140.8721],
  JP5: [39.718614, 140.102364],
  JP6: [38.240436, 140.363633],
  JP7: [37.750299, 140.467551],
  JP8: [36.341811, 140.446793],
  JP9: [36.565725, 139.883565],
  JP10: [36.390668, 139.060406],
  JP11: [35.856999, 139.648849],
  JP12: [35.605057, 140.123306],
  JP13: [35.689488, 139.691706],
  JP14: [35.447507, 139.642345],
  JP15: [37.902552, 139.023095],
  JP16: [36.695291, 137.211338],
  JP17: [36.594682, 136.625573],
  JP18: [36.065178, 136.221527],
  JP19: [35.664158, 138.568449],
  JP20: [36.651299, 138.180956],
  JP21: [35.391227, 136.722291],
  JP22: [34.97712, 138.383084],
  JP23: [35.180188, 136.906565],
  JP24: [34.730283, 136.508588],
  JP25: [35.004531, 135.86859],
  JP26: [35.021247, 135.755597],
  JP27: [34.686297, 135.519661],
  JP28: [34.691269, 135.183071],
  JP29: [34.685334, 135.832742],
  JP30: [34.225987, 135.167509],
  JP31: [35.503891, 134.237736],
  JP32: [35.472295, 133.0505],
  JP33: [34.661751, 133.934406],
  JP34: [34.39656, 132.459622],
  JP35: [34.185956, 131.470649],
  JP36: [34.065718, 134.55936],
  JP37: [34.340149, 134.043444],
  JP38: [33.841624, 132.765681],
  JP39: [33.559706, 133.531079],
  JP40: [33.606576, 130.418297],
  JP41: [33.249442, 130.299794],
  JP42: [32.744839, 129.873756],
  JP43: [32.789827, 130.741667],
  JP44: [33.238172, 131.612619],
  JP45: [31.911096, 131.423893],
  JP46: [31.560146, 130.557978],
  JP47: [26.2124, 127.680932],
};

/** 指定エリアの GPS 座標文字列を生成 (±0~2.77km のランダムオフセット付き) */
export function getAreaCoords(areaId: string): string {
  const base = COORDINATES[areaId];
  if (!base) return `${COORDINATES.JP13[0]},${COORDINATES.JP13[1]},gps`;
  const lat = base[0] + (Math.random() / 40) * (Math.random() < 0.5 ? 1 : -1);
  const lon = base[1] + (Math.random() / 40) * (Math.random() < 0.5 ? 1 : -1);
  return `${lat.toFixed(6)},${lon.toFixed(6)},gps`;
}

/** 指定エリアの GPS 座標を request.cf の lat/lon から生成 */
export function getCfCoords(lat: number, lon: number): string {
  return `${lat.toFixed(6)},${lon.toFixed(6)},gps`;
}

// ---------------------------------------------------------------------------
// ランダムデバイス情報生成
// ---------------------------------------------------------------------------

const MODELS = [
  "SC-02H",
  "SC-02J",
  "SC-03J",
  "SM-G950F",
  "SM-G955F",
  "SM-G960F",
  "SM-G965F",
  "SM-N950F",
  "SO-01F",
  "SO-03F",
  "SO-01G",
  "SO-03G",
  "SO-01H",
  "SO-03H",
  "SO-01J",
  "SO-01K",
  "SH-03J",
  "KYV42",
  "F-04E",
];

const ANDROID_VERSIONS = [
  { version: "7.0.0", sdk: "24" },
  { version: "7.1.1", sdk: "25" },
  { version: "8.0.0", sdk: "26" },
  { version: "8.1.0", sdk: "27" },
  { version: "9.0.0", sdk: "28" },
  { version: "10.0.0", sdk: "29" },
  { version: "11.0.0", sdk: "30" },
  { version: "12.0.0", sdk: "31" },
];

const APP_VERSIONS = [
  "7.5.0",
  "7.4.17",
  "7.4.16",
  "7.4.15",
  "7.4.14",
  "7.4.13",
  "7.4.12",
  "7.4.11",
  "7.4.10",
  "7.4.9",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/** aSmartPhone7a のデバイス情報ヘッダーを生成 */
export function generateMobileDeviceHeaders(): Record<string, string> {
  const ver = randomChoice(ANDROID_VERSIONS);
  const model = randomChoice(MODELS);
  return {
    "X-Radiko-App": "aSmartPhone7a",
    "X-Radiko-App-Version": randomChoice(APP_VERSIONS),
    "X-Radiko-Device": `${ver.sdk}.${model}`,
    "X-Radiko-User": randomHex(32),
    "User-Agent": `Dalvik/2.1.0 (Linux; U; Android ${ver.version};${model}/NRD90M)`,
  };
}

// ---------------------------------------------------------------------------
// モバイル partial key 計算
// ---------------------------------------------------------------------------

/** バイナリキーから partial key を Base64 で計算 */
export function computeMobilePartialKey(offset: number, length: number): string {
  const slice = RADIKO_MOBILE_KEY.slice(offset, offset + length);
  let binary = "";
  for (let i = 0; i < slice.length; i++) {
    binary += String.fromCharCode(slice[i]);
  }
  return btoa(binary);
}
