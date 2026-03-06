/**
 * ExternalInput コンポーネントのブラウザテスト。
 * デバイス一覧の表示とクリック時の connect 呼び出しを検証する。
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockConnect = vi.fn();
vi.mock("@/hooks/mediastream", () => ({
	useMediaStream: () => ({
		connect: mockConnect,
		disconnect: vi.fn(),
	}),
}));

// navigator.mediaDevices.enumerateDevices のモック
const mockDevices: MediaDeviceInfo[] = [
	{
		deviceId: "default",
		kind: "audioinput",
		label: "Default - Built-in Microphone",
		groupId: "g1",
		toJSON: () => ({}),
	},
	{
		deviceId: "mic-2",
		kind: "audioinput",
		label: "External USB Microphone",
		groupId: "g2",
		toJSON: () => ({}),
	},
];

if (!navigator.mediaDevices) {
	Object.defineProperty(navigator, "mediaDevices", {
		value: {
			enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
			getUserMedia: vi
				.fn()
				.mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream),
		},
	});
} else {
	vi.spyOn(navigator.mediaDevices, "enumerateDevices").mockResolvedValue(
		mockDevices,
	);
	vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue({
		getTracks: () => [],
	} as unknown as MediaStream);
}

import { ExternalInput } from "@/components/source/ExternalInput";

function Wrapper({ children }: { children: React.ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("ExternalInput", () => {
	test("「マイク入力」Badge が表示される", async () => {
		render(
			<Wrapper>
				<ExternalInput />
			</Wrapper>,
		);
		await expect.element(page.getByText("マイク入力")).toBeInTheDocument();
	});

	test("デバイス一覧が表示される", async () => {
		render(
			<Wrapper>
				<ExternalInput />
			</Wrapper>,
		);

		// useQuery のデータ取得を待つ
		await expect
			.element(page.getByText("Default - Built-in Microphone"))
			.toBeInTheDocument();
		await expect
			.element(page.getByText("External USB Microphone"))
			.toBeInTheDocument();
	});

	test("デバイスクリックで connect が呼ばれる", async () => {
		mockConnect.mockClear();
		render(
			<Wrapper>
				<ExternalInput />
			</Wrapper>,
		);

		await expect
			.element(page.getByText("Default - Built-in Microphone"))
			.toBeInTheDocument();

		await page
			.getByRole("button", { name: "Default - Built-in Microphone" })
			.click();

		await vi.waitFor(() => {
			expect(mockConnect).toHaveBeenCalledOnce();
		});
	});
});
