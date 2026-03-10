// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { parseRadiruStationXml } from "./radiru";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <stream_url>
    <data>
      <areajp>東京</areajp>
      <area>tokyo</area>
      <apikey>130</apikey>
      <areakey>130</areakey>
      <r1hls>https://nhkradioakr1-i.akamaihd.net/hls/live/512098/1-r1/1-r1-01.m3u8</r1hls>
      <r2hls>https://nhkradioakr2-i.akamaihd.net/hls/live/512100/1-r2/1-r2-01.m3u8</r2hls>
      <fmhls>https://nhkradioakfm-i.akamaihd.net/hls/live/512102/1-fm/1-fm-01.m3u8</fmhls>
    </data>
    <data>
      <areajp>大阪</areajp>
      <area>osaka</area>
      <apikey>270</apikey>
      <areakey>270</areakey>
      <r1hls>https://nhkradioakr1-i.akamaihd.net/hls/live/512098/2-r1/2-r1-01.m3u8</r1hls>
      <r2hls></r2hls>
      <fmhls>https://nhkradioakfm-i.akamaihd.net/hls/live/512102/2-fm/2-fm-01.m3u8</fmhls>
    </data>
  </stream_url>
</config>`;

describe("parseRadiruStationXml", () => {
	test("局リスト XML を正しくパースする", () => {
		const stations = parseRadiruStationXml(SAMPLE_XML);
		expect(stations).toHaveLength(2);
	});

	test("各フィールドが正しく取得される", () => {
		const [tokyo] = parseRadiruStationXml(SAMPLE_XML);
		expect(tokyo.areajp).toBe("東京");
		expect(tokyo.area).toBe("tokyo");
		expect(tokyo.apikey).toBe(130);
		expect(tokyo.areakey).toBe(130);
		expect(tokyo.r1hls).toContain("1-r1");
		expect(tokyo.r2hls).toContain("1-r2");
		expect(tokyo.fmhls).toContain("1-fm");
	});

	test("空の HLS URL はデフォルト空文字を返す", () => {
		const stations = parseRadiruStationXml(SAMPLE_XML);
		expect(stations[1].r2hls).toBe("");
	});

	test("空の XML で空配列を返す", () => {
		const xml =
			'<?xml version="1.0"?><config><stream_url></stream_url></config>';
		expect(parseRadiruStationXml(xml)).toEqual([]);
	});

	test("要素が欠落している場合デフォルト値が設定される", () => {
		const xml = `<?xml version="1.0"?>
<config><stream_url><data><areajp>札幌</areajp></data></stream_url></config>`;
		const [station] = parseRadiruStationXml(xml);
		expect(station.areajp).toBe("札幌");
		expect(station.area).toBe("");
		expect(station.apikey).toBe(0);
		expect(station.r1hls).toBe("");
	});
});
