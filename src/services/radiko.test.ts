// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { parseRadikoStationXml } from "./radiko";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<stations>
  <station>
    <id>TBS</id>
    <name>TBSラジオ</name>
    <ascii_name>TBS RADIO</ascii_name>
    <ruby>ティービーエスラジオ</ruby>
    <areafree>1</areafree>
    <timefree>1</timefree>
    <logo>https://example.com/tbs-logo.png</logo>
    <banner>https://example.com/tbs-banner.png</banner>
    <href>https://www.tbsradio.jp/</href>
    <simul_max_delay>15</simul_max_delay>
    <tf_max_delay>60</tf_max_delay>
  </station>
  <station>
    <id>QRR</id>
    <name>文化放送</name>
    <ascii_name>JOQR</ascii_name>
    <ruby>ブンカホウソウ</ruby>
    <areafree>0</areafree>
    <timefree>1</timefree>
    <logo>https://example.com/qrr1.png</logo>
    <logo>https://example.com/qrr2.png</logo>
    <banner></banner>
    <href>https://www.joqr.co.jp/</href>
    <simul_max_delay>0</simul_max_delay>
    <tf_max_delay>30</tf_max_delay>
  </station>
</stations>`;

describe("parseRadikoStationXml", () => {
	test("局リスト XML を正しくパースする", () => {
		const stations = parseRadikoStationXml(SAMPLE_XML);
		expect(stations).toHaveLength(2);
	});

	test("各フィールドが正しく取得される", () => {
		const [tbs] = parseRadikoStationXml(SAMPLE_XML);
		expect(tbs.id).toBe("TBS");
		expect(tbs.name).toBe("TBSラジオ");
		expect(tbs.ascii_name).toBe("TBS RADIO");
		expect(tbs.ruby).toBe("ティービーエスラジオ");
		expect(tbs.areafree).toBe(1);
		expect(tbs.timefree).toBe(1);
		expect(tbs.banner).toBe("https://example.com/tbs-banner.png");
		expect(tbs.href).toBe("https://www.tbsradio.jp/");
		expect(tbs.simul_max_delay).toBe(15);
		expect(tbs.tf_max_delay).toBe(60);
	});

	test("logo が配列として取得される", () => {
		const stations = parseRadikoStationXml(SAMPLE_XML);
		expect(stations[0].logo).toEqual(["https://example.com/tbs-logo.png"]);
		expect(stations[1].logo).toEqual([
			"https://example.com/qrr1.png",
			"https://example.com/qrr2.png",
		]);
	});

	test("areafree/timefree が数値に変換される", () => {
		const stations = parseRadikoStationXml(SAMPLE_XML);
		expect(stations[0].areafree).toBe(1);
		expect(stations[1].areafree).toBe(0);
	});

	test("空の XML で空配列を返す", () => {
		const xml = '<?xml version="1.0"?><stations></stations>';
		expect(parseRadikoStationXml(xml)).toEqual([]);
	});

	test("要素が欠落している場合デフォルト値が設定される", () => {
		const xml = `<?xml version="1.0"?>
<stations><station><id>TEST</id></station></stations>`;
		const [station] = parseRadikoStationXml(xml);
		expect(station.id).toBe("TEST");
		expect(station.name).toBe("");
		expect(station.areafree).toBe(0);
		expect(station.logo).toEqual([]);
	});
});
