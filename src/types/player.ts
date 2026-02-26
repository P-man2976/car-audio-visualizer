export interface Song {
	id: string;
	filename: string;
	url: string;
	artwork?: string;
	duration?: number;
	title?: string;
	track: { no?: number; of?: number };
	album?: string;
	artists?: string[];
	genre?: string[];
	date?: string;
	year?: number;
}
