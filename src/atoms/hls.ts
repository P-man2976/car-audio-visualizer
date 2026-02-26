import Hls from "hls.js";
import { atom } from "jotai";

export const hlsAtom = atom(new Hls());
