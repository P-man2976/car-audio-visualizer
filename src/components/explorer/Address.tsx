import {
	LuArrowLeft,
	LuArrowRight,
	LuArrowUp,
	LuChevronRight,
} from "react-icons/lu";
import { Button } from "../ui/button";
import { useAddress } from "@/hooks/explorer";
import { Fragment } from "react";

export function Address() {
	const { stack, forwardStack, back, advance, goUp } = useAddress();

	const canGoBack = stack.length > 1;
	const canGoForward = forwardStack.length > 0;
	const canGoUp = stack.length > 1;

	return (
		<div className="flex gap-2 items-center">
			<Button disabled={!canGoBack} onClick={back}>
				<LuArrowLeft />
			</Button>
			<Button disabled={!canGoForward} onClick={advance}>
				<LuArrowRight />
			</Button>
			<Button disabled={!canGoUp} onClick={goUp}>
				<LuArrowUp />
			</Button>
			<div className="py-1 px-4 flex overflow-x-auto w-full rounded-md bg-gray-700/30 items-center">
				{stack.map((handle, index) => (
					<Fragment key={`${index}-${handle.name}`}>
						<Button size="sm" variant="ghost">
							{handle.name}
						</Button>
						{index < stack.length - 1 && (
							<LuChevronRight className="shrink-0" />
						)}
					</Fragment>
				))}
			</div>
		</div>
	);
}
