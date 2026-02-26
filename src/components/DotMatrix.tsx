import { Plane, Text } from "@react-three/drei";
import { useAtomValue } from "jotai";
import { displayStringAtom } from "../atoms/display";

const DOT_MATRIX_COL_COUNT = 7;
const DOT_MATRIX_ROW_COUNT = 5;
const DOT_MATRIX_DOT_SIZE = 1.75;
const DOT_MATRIX_DOT_GAP = 0.3;

const DOT_MATRIX_ARRAY_COUNT = 12;
const DOT_MATRIX_ARRAY_GAP = 2;

export function DotMatrixArray() {
	const displayString = useAtomValue(displayStringAtom);

	return (
		<mesh
			position={[
				-(
					(DOT_MATRIX_DOT_SIZE * DOT_MATRIX_ROW_COUNT +
						DOT_MATRIX_DOT_GAP * (DOT_MATRIX_ROW_COUNT - 1)) *
						DOT_MATRIX_ARRAY_COUNT +
					DOT_MATRIX_ARRAY_GAP * (DOT_MATRIX_ARRAY_COUNT - 1)
				) / 2,
				40,
				0,
			]}
		>
			{Array.from({ length: DOT_MATRIX_ARRAY_COUNT }).map((_, index) => (
				<mesh
					key={`dot-matrix-${index}`}
					position={[
						index * DOT_MATRIX_ROW_COUNT * (DOT_MATRIX_DOT_GAP + DOT_MATRIX_DOT_SIZE) +
							DOT_MATRIX_ARRAY_GAP * index,
						0,
						0,
					]}
				>
					<DotMatrix char={displayString[index] ?? " "} />
				</mesh>
			))}
		</mesh>
	);
}

function DotMatrix({ char }: { char: string }) {
	return (
		<mesh position={[0, 0, 0]}>
			<Text
				characters="CD 1234567890-:"
				position={[-DOT_MATRIX_DOT_SIZE + 0.36, -DOT_MATRIX_DOT_SIZE * 2 - DOT_MATRIX_DOT_GAP, 0]}
				anchorX="left"
				anchorY="bottom"
				fontSize={16}
				color="#67e8f9"
        font="/LCD5x7_Regular.otf"
			>
				{char}
			</Text>
			{Array.from({ length: DOT_MATRIX_ROW_COUNT }).map((_, rowIndex) =>
				Array.from({ length: DOT_MATRIX_COL_COUNT }).map((__, colIndex) => (
					<Plane
						key={`${rowIndex}-${colIndex}`}
						position={[
							(DOT_MATRIX_DOT_SIZE + DOT_MATRIX_DOT_GAP) * rowIndex,
							(DOT_MATRIX_DOT_SIZE + DOT_MATRIX_DOT_GAP) * colIndex,
							0,
						]}
						args={[DOT_MATRIX_DOT_SIZE, DOT_MATRIX_DOT_SIZE]}
						material-color="#3b0764"
					/>
				)),
			)}
		</mesh>
	);
}
