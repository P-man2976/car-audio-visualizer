/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_LASTFM_APIKEY: string;
	readonly VITE_LASTFM_SECRET: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
