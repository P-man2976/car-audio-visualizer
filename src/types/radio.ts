export type RadioType = "AM" | "FM";

export type Radio =
	| {
			type: RadioType;
			source: "radiko";
			id: string;
			name: string;
			frequency?: number;
			logo?: string;
	  }
	| {
			type: RadioType;
			source: "radiru";
			url: string;
			name: string;
			frequency?: number;
			logo?: string;
	  };

export type RadikoStation = {
	id: string;
	name: string;
	ascii_name: string;
	ruby: string;
	areafree: 0 | 1;
	timefree: 0 | 1;
	logo: string[];
	banner: string;
	href: string;
	simul_max_delay: number;
	tf_max_delay: number;
};

export type RadiruStation = {
	areajp: string;
	area: string;
	apikey: number;
	areakey: number;
	r1hls: string;
	r2hls: string;
	fmhls: string;
};
