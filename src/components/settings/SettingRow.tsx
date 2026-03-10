import type React from "react";

export function SettingRow({
	label,
	description,
	htmlFor,
	children,
}: {
	label: string;
	description?: string;
	htmlFor?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
				<div className="flex flex-col gap-0.5 min-w-0">
					<label
						htmlFor={htmlFor}
						className="text-sm font-medium text-neutral-200 leading-none cursor-default"
					>
						{label}
					</label>
					{description && (
						<p className="text-xs text-neutral-500 leading-relaxed">
							{description}
						</p>
					)}
				</div>
				<div className="w-full sm:w-auto sm:shrink-0">{children}</div>
			</div>
		</div>
	);
}

export function SectionHeader({ title }: { title: string }) {
	return (
		<div className="flex flex-col gap-1 pt-1">
			<span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
				{title}
			</span>
			<div className="h-px bg-neutral-800" />
		</div>
	);
}
