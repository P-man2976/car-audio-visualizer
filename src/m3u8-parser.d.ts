declare module "m3u8-parser" {
	export class Parser {
		manifest: {
			segments?: Array<unknown>;
			targetDuration?: number;
			endList?: boolean;
		};
		push(data: string): void;
		end(): void;
	}
}
