import { useCallback, useRef, useState } from "react";

/** Document Picture-in-Picture API の型補完（Chrome 116+） */
interface DocumentPictureInPicture extends EventTarget {
	requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
	readonly window: Window | null;
}

declare global {
	interface Window {
		documentPictureInPicture?: DocumentPictureInPicture;
	}
}

/**
 * Document Picture-in-Picture API を使ってビジュアライザーの canvas を
 * フローティングウィンドウに表示するフック。
 *
 * canvas は DOM 要素を PiP ウィンドウへ移動し、閉じたら元の場所に戻す。
 */
export function usePiP() {
	const [isPiP, setIsPiP] = useState(false);
	const pipWindowRef = useRef<Window | null>(null);
	const placeholderRef = useRef<HTMLDivElement | null>(null);
	const savedStyleRef = useRef<{ width: string; height: string } | null>(null);

	/** PiP を開始する */
	const enterPiP = useCallback(async () => {
		if (!window.documentPictureInPicture) {
			console.warn("Document Picture-in-Picture API is not supported in this browser.");
			return;
		}

		const canvas = document.querySelector("canvas");
		if (!canvas || pipWindowRef.current) return;

		const pip = await window.documentPictureInPicture.requestWindow({
			width: 480,
			height: 270,
		});
		pipWindowRef.current = pip;

		// PiP ウィンドウのスタイルを設定
		pip.document.body.style.cssText =
			"margin:0;padding:0;background:#000;overflow:hidden;width:100vw;height:100vh;";

		// canvas の元スタイルを保存してフルサイズに書き換え
		savedStyleRef.current = { width: canvas.style.width, height: canvas.style.height };
		canvas.style.width = "100%";
		canvas.style.height = "100%";

		// 元の場所にプレースホルダーを挿入して空間を維持
		const placeholder = document.createElement("div");
		placeholder.style.cssText = `width:${canvas.offsetWidth}px;height:${canvas.offsetHeight}px;`;
		canvas.parentElement?.insertBefore(placeholder, canvas);
		placeholderRef.current = placeholder;

		// canvas を PiP ウィンドウへ移動
		pip.document.body.appendChild(canvas);
		setIsPiP(true);

		// PiP が閉じられたら canvas を元の場所に戻す
		pip.addEventListener("pagehide", () => {
			const ph = placeholderRef.current;
			if (ph) {
				ph.parentElement?.insertBefore(canvas, ph);
				ph.remove();
				placeholderRef.current = null;
			}
			// 元のスタイルを復元
			if (savedStyleRef.current) {
				canvas.style.width = savedStyleRef.current.width;
				canvas.style.height = savedStyleRef.current.height;
				savedStyleRef.current = null;
			}
			setIsPiP(false);
			pipWindowRef.current = null;
		});
	}, []);

	/** PiP を終了する */
	const exitPiP = useCallback(() => {
		pipWindowRef.current?.close();
	}, []);

	const isSupported = typeof window !== "undefined" && !!window.documentPictureInPicture;

	return { isPiP, enterPiP, exitPiP, isSupported };
}
