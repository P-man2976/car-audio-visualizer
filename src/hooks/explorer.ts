import {
	explorerForwardStackAtom,
	explorerNavigationStackAtom,
} from "@/atoms/explorer";
import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";

export function useAddress() {
	const [stack, setStack] = useAtom(explorerNavigationStackAtom);
	const [forwardStack, setForwardStack] = useAtom(explorerForwardStackAtom);

	const current = useMemo(() => stack.at(-1) ?? null, [stack]);

	/** Breadcrumb path derived from handle names */
	const pathStr = useMemo(() => stack.map((h) => h.name).join("/"), [stack]);

	const push = useCallback(
		(handle: FileSystemDirectoryHandle) => {
			setStack((prev) => [...prev, handle]);
			setForwardStack([]);
		},
		[setStack, setForwardStack],
	);

	const back = useCallback(() => {
		const last = stack.at(-1);
		if (!last || stack.length <= 1) return;
		setForwardStack((prev) => [last, ...prev]);
		setStack((prev) => prev.slice(0, -1));
	}, [stack, setStack, setForwardStack]);

	const advance = useCallback(() => {
		const next = forwardStack[0];
		if (!next) return;
		setStack((prev) => [...prev, next]);
		setForwardStack((prev) => prev.slice(1));
	}, [forwardStack, setStack, setForwardStack]);

	const goUp = useCallback(() => {
		if (stack.length <= 1) return;
		back();
	}, [stack.length, back]);

	return { stack, forwardStack, current, pathStr, push, back, advance, goUp };
}
