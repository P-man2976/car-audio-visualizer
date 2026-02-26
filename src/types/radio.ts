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

export type FrequencyArea = {
	area: string[];
	frequency: number;
	primary: boolean;
};

export type FrequencyStation =
	| {
			area: string[];
			type: "AM";
			name: string;
			frequencies_fm?: FrequencyArea[];
			frequencies_am: FrequencyArea[];
	  }
	| {
			area: string[];
			type: "FM";
			name: string;
			frequencies_fm: FrequencyArea[];
			frequencies_am?: never;
	  };

export type FrequencyList = Record<string, FrequencyStation>;
