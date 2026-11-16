import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { CropId } from '@/constants/crops';

// Every icon is drawn on a 48×48 grid and scaled to the requested size.
const palette = {
  leaf: '#4CAF72',
  darkLeaf: '#2E7D4F',
  lightLeaf: '#8FD06A',
  stem: '#6E8B3D',
  brown: '#8B5A2B',
  darkBrown: '#6E4520',
  straw: '#C9A04A',
  grain: '#E3B04B',
  red: '#E0483E',
  deepRed: '#C62839',
  orange: '#F28C28',
  yellow: '#F6C343',
  cream: '#F3E3C3',
  white: '#FFFFFF',
  seed: '#2F2A28',
};

type Stroke = { stroke: string; width?: number };

/** A stroked, unfilled path with rounded ends. */
function Line({ d, stroke, width = 2 }: { d: string } & Stroke) {
  return (
    <Path
      d={d}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** Ellipse rotated about its own centre. */
function Oval({
  cx,
  cy,
  rx,
  ry,
  angle = 0,
  fill,
  opacity,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle?: number;
  fill: string;
  opacity?: number;
}) {
  return (
    <Ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={fill}
      opacity={opacity}
      transform={angle ? `rotate(${angle} ${cx} ${cy})` : undefined}
    />
  );
}

/** Grid of small dots kept inside an ellipse — skin textures like litchi or jackfruit. */
function Speckles({
  cx,
  cy,
  rx,
  ry,
  step,
  r,
  fill,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  step: number;
  r: number;
  fill: string;
}) {
  const dots: ReactNode[] = [];
  for (let x = cx - rx; x <= cx + rx; x += step) {
    for (let y = cy - ry; y <= cy + ry; y += step) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 0.72) {
        dots.push(<Circle key={`${x}:${y}`} cx={x} cy={y} r={r} fill={fill} />);
      }
    }
  }
  return <G>{dots}</G>;
}

/** Petals evenly spaced around a centre, each pointing outwards. */
function PetalRing({
  cx,
  cy,
  count,
  radius,
  rx,
  ry,
  fill,
}: {
  cx: number;
  cy: number;
  count: number;
  radius: number;
  rx: number;
  ry: number;
  fill: string;
}) {
  return (
    <G>
      {Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i;
        const x = cx + radius * Math.cos((angle * Math.PI) / 180);
        const y = cy + radius * Math.sin((angle * Math.PI) / 180);
        return <Oval key={i} cx={x} cy={y} rx={rx} ry={ry} angle={angle + 90} fill={fill} />;
      })}
    </G>
  );
}

/** Tiny four-petal flower, used for canola. */
function Blossom({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Circle cx={cx - 2.4} cy={cy} r={2.5} fill="#F4D03F" />
      <Circle cx={cx + 2.4} cy={cy} r={2.5} fill="#F4D03F" />
      <Circle cx={cx} cy={cy - 2.4} r={2.5} fill="#F4D03F" />
      <Circle cx={cx} cy={cy + 2.4} r={2.5} fill="#F4D03F" />
      <Circle cx={cx} cy={cy} r={1.3} fill="#E0A11B" />
    </G>
  );
}

/** Closed outline alternating between an ellipse and a smaller one, giving spikes. */
function spikyEllipse(cx: number, cy: number, rx: number, ry: number, spikes: number, depth: number) {
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const t = (Math.PI * i) / spikes;
    const scale = i % 2 === 0 ? 1 : 1 - depth;
    points.push(`${(cx + rx * scale * Math.cos(t)).toFixed(1)} ${(cy + ry * scale * Math.sin(t)).toFixed(1)}`);
  }
  return `M${points.join(' L')} Z`;
}

const ICONS: Record<CropId, ReactNode> = {
  almond: (
    <>
      <Path d="M34 15 C40 20 42 29 38 35 C36 38 32 38 31 35 C29 29 30 21 34 16 Z" fill="#B97A4A" />
      <Path d="M21 7 C30 13 34 27 28 37 C25 42 17 42 14 37 C9 28 12 13 21 7 Z" fill="#C68B59" />
      <Line d="M20 12 C17 20 17 29 20 37" stroke="#A86B3C" width={1.5} />
      <Line d="M24 14 C26 21 26 28 24 34" stroke="#A86B3C" width={1.2} />
    </>
  ),
  apple: (
    <>
      <Path
        d="M24 15 C18 11 9 14 9 25 C9 34 15 41 20 41 C22 41 23 40 24 40 C25 40 26 41 28 41 C33 41 39 34 39 25 C39 14 30 11 24 15 Z"
        fill={palette.red}
      />
      <Line d="M24 15 C24 11 25 8 27 6" stroke={palette.brown} />
      <Path d="M26 10 C30 6 35 7 36 9 C33 12 29 12 26 10 Z" fill={palette.leaf} />
      <Oval cx={16} cy={24} rx={2.5} ry={4} fill={palette.white} opacity={0.35} />
    </>
  ),
  apricot: (
    <>
      <Circle cx={24} cy={27} r={14} fill="#F5A142" />
      <Circle cx={30} cy={31} r={7} fill="#EE7B3A" opacity={0.45} />
      <Line d="M24 13 C19 20 19 33 24 41" stroke="#E08A2C" width={1.5} />
      <Path d="M24 13 C27 8 32 7 35 9 C32 13 28 14 24 13 Z" fill={palette.leaf} />
    </>
  ),
  banana: (
    <>
      <Path d="M9 13 C10 29 20 40 37 39 C40 38.8 40.5 35.5 38 35 C25 33 17 25 14 12 Z" fill={palette.yellow} />
      <Path d="M14 12 C17 25 25 33 38 35 C35 31 27 27 21 12 Z" fill="#E9B23A" />
      <Path d="M9.5 13 L10 8 L14.5 8.5 L14 12 Z" fill={palette.brown} />
      <Circle cx={39} cy={37} r={1.4} fill={palette.darkBrown} />
    </>
  ),
  barley: (
    <>
      <Line d="M24 46 V18" stroke={palette.straw} />
      <Line d="M20 30 L12 16 M20 24.5 L13 9 M21 19 L16 4 M28 27 L36 13 M28 21.5 L34 6 M24 11 V2" stroke="#D9B45A" width={1.2} />
      <Oval cx={20.5} cy={33} rx={2.6} ry={4.2} angle={-25} fill={palette.grain} />
      <Oval cx={20.5} cy={27.5} rx={2.6} ry={4.2} angle={-25} fill={palette.grain} />
      <Oval cx={21} cy={22} rx={2.6} ry={4.2} angle={-25} fill={palette.grain} />
      <Oval cx={27.5} cy={30} rx={2.6} ry={4.2} angle={25} fill={palette.grain} />
      <Oval cx={27.5} cy={24.5} rx={2.6} ry={4.2} angle={25} fill={palette.grain} />
      <Oval cx={27} cy={19} rx={2.6} ry={4.2} angle={25} fill={palette.grain} />
      <Oval cx={24} cy={14} rx={2.4} ry={4} fill={palette.grain} />
    </>
  ),
  bean: (
    <>
      <Path
        d="M8 30 C10 22 18 16 28 14 C34 13 39 14 41 16 C42 18 40 20 37 20 C30 21 24 24 20 30 C17 34 12 37 9 36 C7 35 7 33 8 30 Z"
        fill="#5DAA3C"
      />
      <Circle cx={15} cy={28} r={3.2} fill="#7CC45A" />
      <Circle cx={22} cy={22.5} r={3.4} fill="#7CC45A" />
      <Circle cx={30} cy={18} r={3.2} fill="#7CC45A" />
      <Line d="M41 16 L45 13" stroke={palette.darkLeaf} />
    </>
  ),
  bitter_gourd: (
    <>
      <Path
        d="M14 40 C10 36 12 26 18 18 C23 11 30 7 35 8 C39 9 39 14 36 20 C32 28 26 36 20 40 C18 41.5 16 41.5 14 40 Z"
        fill="#6DB33F"
      />
      {[
        [18, 30],
        [22, 24],
        [27, 18],
        [31, 13],
        [16, 36],
        [24, 31],
        [29, 24],
        [33, 17],
      ].map(([cx, cy]) => (
        <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={1.5} fill="#4F8F2A" />
      ))}
      <Line d="M35 8 L39 4" stroke={palette.brown} />
    </>
  ),
  black_green_gram: (
    <>
      {[
        [15, 19, -20],
        [23, 13, 15],
        [12, 28, 10],
        [21, 25, -30],
      ].map(([cx, cy, angle]) => (
        <G key={`b${cx}:${cy}`}>
          <Oval cx={cx} cy={cy} rx={4.2} ry={3.2} angle={angle} fill={palette.seed} />
          <Oval cx={cx} cy={cy} rx={1.4} ry={0.6} angle={angle} fill="#EDE6D8" />
        </G>
      ))}
      {[
        [32, 21, 20],
        [37, 29, -15],
        [28, 31, 30],
        [34, 38, 5],
        [22, 36, -10],
      ].map(([cx, cy, angle]) => (
        <Oval key={`g${cx}:${cy}`} cx={cx} cy={cy} rx={4.2} ry={3.2} angle={angle} fill="#6FA03A" />
      ))}
    </>
  ),
  brinjal: (
    <>
      <Path d="M20 16 C14 20 10 30 14 38 C18 45 30 43 34 34 C37 27 33 20 28 16 Z" fill="#6B3FA0" />
      <Path d="M17 18 C19 12 29 12 31 18 C27 20 21 20 17 18 Z" fill={palette.leaf} />
      <Line d="M24 14 L26 5" stroke={palette.darkLeaf} width={2.5} />
      <Oval cx={18} cy={30} rx={2} ry={5} fill={palette.white} opacity={0.25} />
    </>
  ),
  broad_bean: (
    <>
      <Path
        d="M8 34 C8 24 16 14 30 10 C38 8 42 12 40 18 C37 26 28 36 16 40 C11 41.5 8 39 8 34 Z"
        fill="#8DC26F"
      />
      <Oval cx={16} cy={32} rx={4.5} ry={3.5} angle={-40} fill="#C9E3A6" />
      <Oval cx={24} cy={24} rx={4.5} ry={3.5} angle={-40} fill="#C9E3A6" />
      <Oval cx={32} cy={17} rx={4.5} ry={3.5} angle={-40} fill="#C9E3A6" />
    </>
  ),
  cabbage: (
    <>
      <Circle cx={24} cy={26} r={16} fill="#7DBE5A" />
      <Path d="M8 26 C8 16 16 10 24 10 C20 14 18 20 19 27 C14 25 10 25 8 26 Z" fill="#5FA43F" />
      <Path d="M40 26 C40 16 32 10 24 10 C28 14 30 20 29 27 C34 25 38 25 40 26 Z" fill="#5FA43F" />
      <Circle cx={24} cy={29} r={9} fill="#B5DC8E" />
      <Line d="M24 21 V37 M24 29 L18 25 M24 33 L30 28" stroke="#8CC46A" width={1.4} />
    </>
  ),
  canola: (
    <>
      <Line d="M24 46 V20 M24 32 C20 28 17 24 15 20 M24 28 C28 24 31 20 33 16" stroke="#6E9B3A" />
      <Path d="M24 40 C18 38 13 40 10 44 C16 45 21 44 24 42 Z" fill={palette.leaf} />
      <Blossom cx={24} cy={15} />
      <Blossom cx={14} cy={17} />
      <Blossom cx={34} cy={12} />
      <Blossom cx={19} cy={8} />
      <Blossom cx={29} cy={5} />
    </>
  ),
  capsicum_chilli: (
    <>
      <Path d="M26 8 C29 8 31 11 31 15 C31 23 34 30 41 36 C34 36 28 31 26 24 C24.5 18 24 12 26 8 Z" fill="#4CAF50" />
      <Path d="M14 12 C18 12 21 16 22 22 C23 30 28 37 38 42 C30 43 20 40 15 32 C11 25 11 16 14 12 Z" fill={palette.red} />
      <Path d="M10.5 13 C12 9 17 9 18.5 13 C16 15 13 15 10.5 13 Z" fill={palette.leaf} />
      <Line d="M14 10 C14 7 16 5 19 4" stroke={palette.darkLeaf} />
    </>
  ),
  carrot: (
    <>
      <Path d="M30 16 C34 20 34 24 30 28 L12 42 C10 43.5 8 41.5 9.5 39.5 L24 18 C26 14 28 14 30 16 Z" fill={palette.orange} />
      <Line d="M21 24 L24 26 M17 30 L20 32 M14 35 L16 36.5" stroke="#D9711A" width={1.5} />
      <Path d="M30 17 C30 10 33 6 37 4 C36 9 35 13 32 17 Z" fill={palette.leaf} />
      <Path d="M31 18 C36 13 41 12 45 13 C42 17 37 19 32 19 Z" fill={palette.leaf} />
      <Path d="M30 16 C27 11 27 7 29 4 C31 8 32 12 31 16 Z" fill={palette.darkLeaf} />
    </>
  ),
  cassava: (
    <>
      <Path d="M16 42 C20 36 28 28 38 22 C41 20 43 23 41 25 C33 31 26 37 19 43 C17.5 44 15.5 43.5 16 42 Z" fill="#A06B3A" />
      <Path d="M10 38 C14 30 24 18 36 10 C39 8 42 10 40 13 C32 22 22 32 14 40 C12 42 9 41 10 38 Z" fill={palette.brown} />
      <Oval cx={38} cy={11} rx={3} ry={2.2} angle={-40} fill={palette.cream} />
      <Line d="M18 30 L20.5 32 M25 23 L27.5 25" stroke={palette.darkBrown} width={1.2} />
    </>
  ),
  castor_bean: (
    <>
      <Oval cx={24} cy={26} rx={12} ry={15} fill="#8A5A44" />
      <Oval cx={20} cy={20} rx={3} ry={2} fill="#D9B99B" />
      <Oval cx={28} cy={25} rx={2.5} ry={1.8} fill="#D9B99B" />
      <Oval cx={21} cy={31} rx={2.8} ry={2} fill="#D9B99B" />
      <Oval cx={27} cy={35} rx={2} ry={1.5} fill="#D9B99B" />
      <Oval cx={18} cy={26} rx={1.6} ry={1.2} fill="#D9B99B" />
      <Oval cx={24} cy={11.5} rx={4} ry={2.5} fill={palette.cream} />
    </>
  ),
  cauliflower: (
    <>
      <Path d="M6 30 C10 22 18 24 22 32 C16 38 10 38 6 30 Z" fill={palette.leaf} />
      <Path d="M42 30 C38 22 30 24 26 32 C32 38 38 38 42 30 Z" fill={palette.leaf} />
      <Path d="M14 38 C20 30 28 30 34 38 C28 44 20 44 14 38 Z" fill={palette.darkLeaf} />
      {[
        [18, 22, 6],
        [30, 22, 6],
        [24, 17, 6.5],
        [21, 28, 6],
        [28, 28, 6],
      ].map(([cx, cy, r]) => (
        <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={r} fill="#F7F1DE" stroke="#E3D9BC" strokeWidth={1} />
      ))}
    </>
  ),
  cherry: (
    <>
      <Line d="M16 30 C18 20 24 12 30 8 M32 32 C31 22 30 14 30 8" stroke={palette.stem} />
      <Path d="M30 8 C34 4 40 5 42 8 C38 11 33 11 30 8 Z" fill={palette.leaf} />
      <Circle cx={16} cy={34} r={7} fill={palette.deepRed} />
      <Circle cx={32} cy={36} r={7} fill="#D93545" />
      <Circle cx={13.5} cy={31.5} r={1.8} fill={palette.white} opacity={0.4} />
      <Circle cx={29.5} cy={33.5} r={1.8} fill={palette.white} opacity={0.4} />
    </>
  ),
  chickpea_gram: (
    <>
      {[
        [14, 19],
        [26, 14],
        [20, 29],
        [32, 26],
        [28, 38],
        [14, 38],
      ].map(([cx, cy]) => (
        <G key={`${cx}:${cy}`}>
          <Circle cx={cx} cy={cy} r={5.5} fill="#E3C58F" stroke="#C9A76A" strokeWidth={1} />
          <Line d={`M${cx - 3} ${cy - 3} l-1.6 -1.6`} stroke="#B38F55" width={1.4} />
        </G>
      ))}
    </>
  ),
  citrus: (
    <>
      <Circle cx={22} cy={26} r={14} fill="#F6A623" />
      <Speckles cx={22} cy={26} rx={12} ry={12} step={5} r={0.8} fill="#E08D17" />
      <Circle cx={16} cy={20} r={3} fill={palette.white} opacity={0.3} />
      <Path d="M23 12 C26 6 33 5 37 7 C35 12 29 14 23 12 Z" fill={palette.leaf} />
      <Circle cx={36} cy={36} r={8} fill="#F4D03F" />
      <Circle cx={36} cy={36} r={6.3} fill="#FBEA9A" />
      <Line d="M36 30 V42 M30 36 H42 M31.8 31.8 L40.2 40.2 M40.2 31.8 L31.8 40.2" stroke="#F4D03F" width={1} />
    </>
  ),
  coconut: (
    <>
      <Circle cx={21} cy={24} r={15} fill="#7A4B26" />
      <Circle cx={15} cy={18} r={1.8} fill="#4A2E15" />
      <Circle cx={20} cy={15} r={1.8} fill="#4A2E15" />
      <Circle cx={18} cy={22} r={1.8} fill="#4A2E15" />
      <Circle cx={31} cy={32} r={11} fill="#5E3A1D" />
      <Circle cx={31} cy={32} r={8.5} fill="#FBF6EA" />
    </>
  ),
  coffee: (
    <>
      <Line d="M8 40 C18 30 28 22 42 10" stroke={palette.darkBrown} width={2.2} />
      <Path d="M20 30 C14 22 16 14 22 12 C26 18 25 26 20 30 Z" fill={palette.darkLeaf} />
      <Path d="M30 22 C34 14 42 14 44 18 C40 24 34 25 30 22 Z" fill={palette.leaf} />
      <Circle cx={24} cy={32} r={4.5} fill={palette.deepRed} />
      <Circle cx={31} cy={28} r={4.5} fill={palette.deepRed} />
      <Circle cx={29} cy={36} r={4.5} fill="#D93545" />
      <Oval cx={12} cy={40} rx={5} ry={3.5} angle={-20} fill="#6B3E1E" />
      <Line d="M8.5 41 C11 39 13 39.5 15.5 38.5" stroke="#3E2410" width={1} />
    </>
  ),
  cotton: (
    <>
      <Line d="M24 42 V46" stroke={palette.brown} />
      <Path d="M24 42 C18 40 10 34 9 26 L24 32 L39 26 C38 34 30 40 24 42 Z" fill={palette.brown} />
      {[
        [17, 22, 7],
        [31, 22, 7],
        [24, 16, 7.5],
        [24, 27, 7],
      ].map(([cx, cy, r]) => (
        <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={r} fill={palette.white} stroke="#E6E0D0" strokeWidth={1} />
      ))}
    </>
  ),
  cucumber: (
    <>
      <Path
        d="M10 34 C6 30 8 24 14 20 L28 10 C33 7 38 8 39 12 C40 16 37 19 33 22 L19 33 C16 36 13 37 10 34 Z"
        fill="#4E9A3A"
      />
      <Line d="M14 28 L30 16" stroke="#7CC45A" width={1.6} />
      <Circle cx={38} cy={11} r={1.5} fill="#2E6B22" />
      <Circle cx={34} cy={35} r={9} fill="#4E9A3A" />
      <Circle cx={34} cy={35} r={7.3} fill="#DDEFB8" />
      <Speckles cx={34} cy={35} rx={4} ry={4} step={2.5} r={0.6} fill="#9CBF6A" />
    </>
  ),
  currant: (
    <>
      <Line d="M18 6 C22 12 24 18 26 24" stroke={palette.stem} />
      <Path d="M18 6 C12 4 8 8 8 12 C13 12 17 10 18 6 Z" fill={palette.leaf} />
      {[
        [25, 26],
        [19, 31],
        [29, 32],
        [23, 37],
        [31, 40],
        [17, 39],
      ].map(([cx, cy]) => (
        <G key={`${cx}:${cy}`}>
          <Circle cx={cx} cy={cy} r={4} fill="#D7263D" />
          <Circle cx={cx - 1.3} cy={cy - 1.3} r={1} fill={palette.white} opacity={0.45} />
        </G>
      ))}
    </>
  ),
  durian: (
    <>
      <Path d={spikyEllipse(24, 27, 15, 16, 16, 0.18)} fill="#8DB33A" stroke="#6E8F28" strokeWidth={1} />
      <Oval cx={24} cy={27} rx={9} ry={10} fill="#A3C24A" />
      <Line d="M24 11 V5" stroke={palette.brown} width={2.5} />
    </>
  ),
  ginger: (
    <>
      <Line d="M27 20 C26 15 28 11 31 9" stroke={palette.leaf} />
      <Path
        d="M8 30 C8 24 14 22 18 24 C18 18 24 16 27 20 C30 16 36 17 36 22 C41 22 43 28 39 32 C36 36 30 34 28 32 C24 38 16 38 14 34 C10 36 8 33 8 30 Z"
        fill="#D9A55B"
      />
      <Line d="M18 24 C19 27 19 30 17 33 M28 21 C29 25 29 28 28 32" stroke="#B7813C" width={1.2} />
    </>
  ),
  grape: (
    <>
      <Line d="M23 14 V6" stroke={palette.brown} />
      <Path d="M24 8 C30 4 38 6 40 10 C34 14 28 13 24 8 Z" fill={palette.leaf} />
      {[
        [15, 19, '#7B4BA6'],
        [23, 18, '#8E5CB8'],
        [31, 19, '#7B4BA6'],
        [19, 26, '#8E5CB8'],
        [27, 26, '#7B4BA6'],
        [23, 33, '#8E5CB8'],
        [15, 27, '#6A3D93'],
        [31, 27, '#6A3D93'],
        [19, 34, '#7B4BA6'],
        [27, 34, '#7B4BA6'],
        [23, 40, '#6A3D93'],
      ].map(([cx, cy, fill]) => (
        <Circle key={`${cx}:${cy}`} cx={cx as number} cy={cy as number} r={4.5} fill={fill as string} />
      ))}
    </>
  ),
  guar: (
    <>
      <Line d="M24 4 V16" stroke={palette.darkLeaf} />
      <Path d="M24 8 C18 4 12 6 10 10 C16 13 21 12 24 8 Z" fill={palette.leaf} />
      <Path d="M24 16 C18 22 14 30 13 39 C13.5 40.5 15 40.5 15.5 39 C17 30 20 23 25 17 Z" fill="#5A9E30" />
      <Path d="M24 16 C21 25 20 34 21 43 C22 44.5 23.5 44.5 24 43 C24 34 24.5 25 25.5 16.5 Z" fill="#6DB33F" />
      <Path d="M24.5 16 C30 22 34 30 35 39 C34.5 40.5 33 40.5 32.5 39 C31 30 28 23 23.5 17 Z" fill="#5A9E30" />
      <Path d="M25 16 C33 20 39 26 42 33 C41.5 34.5 40 34.5 39.5 33.5 C36 27 31 22 24 17.5 Z" fill="#6DB33F" />
    </>
  ),
  guava: (
    <>
      <Circle cx={19} cy={25} r={13} fill="#9CCB5B" />
      <Path d="M18 12 C20 6 26 4 30 6 C28 11 23 13 18 12 Z" fill={palette.leaf} />
      <Circle cx={31} cy={31} r={11} fill="#9CCB5B" />
      <Circle cx={31} cy={31} r={9} fill="#F28DA0" />
      <Circle cx={31} cy={31} r={2.5} fill="#F5B5C0" />
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2;
        return (
          <Circle key={i} cx={31 + 5 * Math.cos(angle)} cy={31 + 5 * Math.sin(angle)} r={1} fill="#F8E0A0" />
        );
      })}
    </>
  ),
  jackfruit: (
    <>
      <Oval cx={24} cy={27} rx={13} ry={16} fill="#A3B83A" />
      <Speckles cx={24} cy={27} rx={13} ry={16} step={4} r={1} fill="#7F9128" />
      <Line d="M24 11 L26 5" stroke={palette.brown} width={2.5} />
      <Path d="M26 7 C30 3 36 4 38 7 C34 10 29 10 26 7 Z" fill={palette.leaf} />
    </>
  ),
  litchi: (
    <>
      <Line d="M18 13 C18 9 20 6 23 5" stroke={palette.stem} />
      <Circle cx={18} cy={24} r={11} fill="#D2394F" />
      <Speckles cx={18} cy={24} rx={10} ry={10} step={3.5} r={0.8} fill="#A92438" />
      <Circle cx={31} cy={32} r={10} fill="#C4344A" />
      <Circle cx={31} cy={32} r={7.5} fill="#F7F3E6" stroke="#E6DFC8" strokeWidth={1} />
    </>
  ),
  maize: (
    <>
      <Oval cx={24} cy={22} rx={7} ry={15} fill={palette.yellow} />
      <Speckles cx={24} cy={22} rx={6.5} ry={14} step={3} r={1.1} fill="#E3A92A" />
      <Path d="M24 44 C14 40 12 28 16 18 C18 28 21 36 24 40 Z" fill={palette.leaf} />
      <Path d="M24 44 C34 40 36 28 32 18 C30 28 27 36 24 40 Z" fill={palette.darkLeaf} />
      <Line d="M24 7 C22 4 20 3 18 2 M24 7 C26 4 28 3 30 2" stroke={palette.straw} width={1.2} />
    </>
  ),
  mango: (
    <>
      <Path
        d="M14 20 C18 10 32 8 38 18 C43 27 38 40 26 41 C16 42 10 34 11 27 C11.5 24 12.5 22 14 20 Z"
        fill="#F6B03C"
      />
      <Path d="M30 14 C37 17 40 26 37 33 C33 26 30 20 30 14 Z" fill="#EF7F3A" opacity={0.7} />
      <Line d="M26 10 C26 7 27 5 29 4" stroke={palette.brown} />
      <Path d="M27 7 C31 2 38 2 41 5 C37 9 31 10 27 7 Z" fill={palette.leaf} />
    </>
  ),
  marigold: (
    <>
      <Path d="M10 44 C13 37 20 36 23 40 C19 45 14 46 10 44 Z" fill={palette.leaf} />
      <Path d="M38 44 C35 37 28 36 25 40 C29 45 34 46 38 44 Z" fill={palette.darkLeaf} />
      <PetalRing cx={24} cy={21} count={10} radius={9} rx={5.5} ry={5.5} fill={palette.orange} />
      <PetalRing cx={24} cy={21} count={8} radius={5} rx={4} ry={4} fill="#F6A623" />
      <Circle cx={24} cy={21} r={3.5} fill="#D9711A" />
    </>
  ),
  melon: (
    <>
      <Path d="M6 16 A18 18 0 0 0 42 16 Z" fill="#3F8F3A" />
      <Path d="M9 16 A15 15 0 0 0 39 16 Z" fill="#EDF5D6" />
      <Path d="M11 16 A13 13 0 0 0 37 16 Z" fill="#E8505B" />
      {[
        [17, 21],
        [24, 25],
        [31, 21],
        [21, 29],
        [27, 29],
      ].map(([cx, cy]) => (
        <Oval key={`${cx}:${cy}`} cx={cx} cy={cy} rx={1} ry={1.7} fill={palette.seed} />
      ))}
    </>
  ),
  millet: (
    <>
      <Line d="M24 46 V34" stroke="#9CB34A" width={2.5} />
      <Path d="M24 38 C16 36 10 30 8 24 C14 26 20 30 24 36 Z" fill={palette.leaf} />
      <Rect x={18} y={6} width={12} height={30} rx={6} fill="#C9A462" />
      <Speckles cx={24} cy={21} rx={5.5} ry={15} step={3} r={1} fill="#A8843F" />
    </>
  ),
  okra: (
    <>
      <Path d="M12 40 C10 38 12 32 16 26 L30 10 C32 8 36 8 38 10 C40 12 40 16 38 18 L22 36 C18 40 14 42 12 40 Z" fill="#5DAA3C" />
      <Line d="M15 36 L34 13 M18 38 L37 16" stroke="#4A8F2E" width={1.3} />
      <Path d="M36 8 C38 5 42 5 44 8 C42 11 38 11 36 8 Z" fill={palette.darkLeaf} />
    </>
  ),
  olive: (
    <>
      <Line d="M6 38 C16 32 28 22 42 8" stroke="#6E6A3A" />
      <Path d="M14 33 C12 26 14 20 18 18 C19 24 18 29 14 33 Z" fill="#8FA56A" />
      <Path d="M26 24 C30 18 36 17 40 19 C36 24 31 26 26 24 Z" fill="#8FA56A" />
      <Path d="M33 16 C31 10 33 5 36 3 C38 8 37 13 33 16 Z" fill="#8FA56A" />
      <Oval cx={21} cy={32} rx={3.8} ry={5} angle={30} fill="#5E6B24" />
      <Oval cx={33} cy={26} rx={3.8} ry={5} angle={30} fill="#7C8B3A" />
    </>
  ),
  onion: (
    <>
      <Line d="M24 10 L22 3 M24 10 L27 4" stroke={palette.leaf} />
      <Path d="M24 10 C28 16 38 20 38 30 C38 38 32 42 24 42 C16 42 10 38 10 30 C10 20 20 16 24 10 Z" fill="#B5546B" />
      <Line d="M24 12 C20 20 18 30 22 41 M24 12 C28 20 30 30 26 41" stroke="#93405A" width={1.3} />
      <Line d="M20 42 L19 45 M24 42 V46 M28 42 L29 45" stroke="#C9A77C" width={1.2} />
    </>
  ),
  ornamental: (
    <>
      <Path d="M24 28 C18 24 14 16 16 8 C22 12 25 20 24 28 Z" fill={palette.leaf} />
      <Path d="M24 28 C30 22 36 18 42 18 C40 25 32 29 24 28 Z" fill={palette.darkLeaf} />
      <Path d="M24 28 C18 26 10 24 6 18 C13 16 20 20 24 28 Z" fill="#7CC45A" />
      <Path d="M14 30 H34 L31 44 H17 Z" fill="#D9774B" />
      <Rect x={12} y={27} width={24} height={5} rx={2} fill="#C4623A" />
    </>
  ),
  papaya: (
    <>
      <Path d="M24 6 C32 8 38 18 38 28 C38 38 32 43 24 43 C16 43 10 38 10 28 C10 18 16 8 24 6 Z" fill="#B7C84A" />
      <Path d="M24 9 C30 11 35 19 35 28 C35 36 30 40 24 40 C18 40 13 36 13 28 C13 19 18 11 24 9 Z" fill="#F58B3A" />
      <Oval cx={24} cy={29} rx={5} ry={8} fill="#F9C27A" />
      {[
        [22, 24],
        [26, 24],
        [24, 27],
        [21.5, 30],
        [26.5, 30],
        [24, 33],
      ].map(([cx, cy]) => (
        <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={1.3} fill={palette.seed} />
      ))}
    </>
  ),
  pea: (
    <>
      <Path d="M6 30 C12 18 26 10 40 10 C43 10 44 13 42 15 C32 24 20 34 8 34 C5 34 5 32 6 30 Z" fill="#5DAA3C" />
      <Path d="M10 30 C16 22 26 15 38 13 C30 22 20 29 10 30 Z" fill={palette.lightLeaf} />
      {[
        [15, 27],
        [21, 23],
        [27, 19],
        [33, 16],
      ].map(([cx, cy]) => (
        <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={3.2} fill="#6BBF45" stroke="#4F9A30" strokeWidth={1} />
      ))}
      <Line d="M42 13 C44 9 45 7 46 6" stroke={palette.darkLeaf} />
    </>
  ),
  peach: (
    <>
      <Circle cx={24} cy={27} r={14} fill="#F7A26B" />
      <Circle cx={29} cy={31} r={8} fill="#EF6F6C" opacity={0.6} />
      <Line d="M24 13 C19 20 19 33 24 41" stroke="#E4845A" width={1.5} />
      <Path d="M24 13 C22 7 16 5 12 7 C14 12 19 14 24 13 Z" fill={palette.leaf} />
      <Path d="M24 13 C28 7 34 6 38 8 C35 13 29 14 24 13 Z" fill={palette.darkLeaf} />
    </>
  ),
  peanut: (
    <>
      <Path
        d="M13 12 C16 5 26 6 27 13 C27.5 17 26 19 28 22 C34 24 38 32 34 38 C30 44 21 43 19 36 C18 32 19 29 16 27 C11 24 10 17 13 12 Z"
        fill="#D8B07A"
      />
      <Line d="M15 14 L24 20 M19 9 L26 15 M22 29 L32 37 M23 35 L29 41" stroke="#B98F57" width={1} />
      <Oval cx={38} cy={13} rx={4} ry={5.5} angle={20} fill="#C27A5A" />
    </>
  ),
  pear: (
    <>
      <Path
        d="M24 10 C28 10 29 14 29 18 C29 22 36 26 36 34 C36 40 30 43 24 43 C18 43 12 40 12 34 C12 26 19 22 19 18 C19 14 20 10 24 10 Z"
        fill="#B5CC3E"
      />
      <Oval cx={30} cy={34} rx={4} ry={5} fill="#E8A23B" opacity={0.4} />
      <Line d="M24 10 C24 7 25 5 27 4" stroke={palette.brown} />
      <Path d="M25 7 C29 3 35 4 37 6 C33 9 28 9 25 7 Z" fill={palette.leaf} />
    </>
  ),
  pigeon_pea_red_gram: (
    <>
      <Path d="M8 22 C14 14 26 10 38 12 C42 13 42 16 39 17 C28 18 18 22 10 28 C7 30 5 26 8 22 Z" fill="#7FAF3F" />
      <Line d="M14 19 L16 22 M22 15.5 L23 18.5 M30 13.5 L31 16.5" stroke="#7A3B4A" width={1.2} />
      {[
        [16, 34, '#D98C3A'],
        [23, 36, '#C8733A'],
        [30, 33, '#D98C3A'],
        [20, 41, '#C8733A'],
        [28, 41, '#D98C3A'],
        [35, 38, '#C8733A'],
      ].map(([cx, cy, fill]) => (
        <Circle key={`${cx}:${cy}`} cx={cx as number} cy={cy as number} r={3} fill={fill as string} />
      ))}
    </>
  ),
  pineapple: (
    <>
      <Path d="M24 18 C22 12 18 8 14 6 C18 12 20 16 22 19 Z" fill={palette.leaf} />
      <Path d="M24 18 C24 11 24 6 24 2 C26 7 27 12 26 19 Z" fill={palette.darkLeaf} />
      <Path d="M25 19 C28 13 32 9 36 7 C33 12 30 16 27 20 Z" fill={palette.leaf} />
      <Oval cx={24} cy={31} rx={11} ry={13} fill="#F2B632" />
      <Speckles cx={24} cy={31} rx={11} ry={13} step={4} r={1.1} fill="#D08F1E" />
    </>
  ),
  pistachio: (
    <>
      <Oval cx={36} cy={36} rx={6} ry={8} angle={30} fill="#E8D3A8" />
      <Line d="M32 31 L40 41" stroke="#CDB384" width={1.2} />
      <Oval cx={22} cy={25} rx={11} ry={14} angle={-25} fill="#E8D3A8" />
      <Oval cx={23} cy={24} rx={6.5} ry={9.5} angle={-25} fill="#9DBB4A" />
      <Oval cx={20} cy={20} rx={3} ry={4} angle={-25} fill="#8C5A7A" opacity={0.6} />
    </>
  ),
  pomegranate: (
    <>
      <Path d="M19 14 L20 8 L22.5 11 L24 6 L25.5 11 L28 8 L29 14 Z" fill="#A61E30" />
      <Circle cx={24} cy={27} r={14} fill={palette.deepRed} />
      <Oval cx={18} cy={23} rx={2.5} ry={4} fill={palette.white} opacity={0.3} />
      {[
        [36, 38],
        [39.5, 34.5],
        [40, 40],
        [34.5, 42],
      ].map(([cx, cy]) => (
        <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={2} fill="#E8505B" />
      ))}
    </>
  ),
  potato: (
    <>
      <Path d="M10 26 C10 16 20 12 28 13 C36 14 40 20 39 28 C38 36 30 40 22 39 C14 38 10 33 10 26 Z" fill="#C9955B" />
      <Oval cx={18} cy={22} rx={1.6} ry={1} fill="#A87840" />
      <Oval cx={28} cy={20} rx={1.4} ry={0.9} fill="#A87840" />
      <Oval cx={31} cy={31} rx={1.6} ry={1} fill="#A87840" />
      <Oval cx={20} cy={32} rx={1.3} ry={0.8} fill="#A87840" />
      <Oval cx={17} cy={19} rx={3} ry={1.8} fill={palette.white} opacity={0.25} />
    </>
  ),
  pumpkin: (
    <>
      <Line d="M24 15 C24 11 25 8 28 6" stroke={palette.stem} width={3} />
      <Path d="M26 11 C30 7 36 8 38 11 C34 14 29 14 26 11 Z" fill={palette.leaf} />
      <Oval cx={16} cy={29} rx={8} ry={12} fill="#F08A24" />
      <Oval cx={32} cy={29} rx={8} ry={12} fill="#F08A24" />
      <Oval cx={24} cy={29} rx={9} ry={13} fill="#F59B30" />
      <Line d="M19 19 C17 25 17 33 19 39 M29 19 C31 25 31 33 29 39" stroke="#D9711A" width={1} />
    </>
  ),
  rice: (
    <>
      <Path d="M18 36 C10 34 6 28 6 22 C12 26 16 30 18 36 Z" fill={palette.leaf} />
      <Line d="M16 44 C18 30 22 18 30 8" stroke="#8BAF3A" />
      <Line d="M30 8 C36 10 40 16 40 24 M26 14 C32 18 34 24 33 32 M22 22 C27 26 28 32 26 38" stroke="#A7B94A" width={1.5} />
      {[
        [37, 12, 40],
        [39.5, 17, 20],
        [40, 22.5, 5],
        [31, 18, 35],
        [33, 23, 15],
        [33.5, 28.5, 0],
        [26, 26, 35],
        [27.5, 31, 15],
        [26.5, 36, 0],
      ].map(([cx, cy, angle]) => (
        <Oval key={`${cx}:${cy}`} cx={cx} cy={cy} rx={1.8} ry={3} angle={angle} fill="#E3C25A" />
      ))}
    </>
  ),
  rose: (
    <>
      <Line d="M24 31 V46" stroke={palette.darkLeaf} width={2.5} />
      <Path d="M24 38 C18 34 12 35 10 38 C14 42 20 42 24 38 Z" fill={palette.leaf} />
      <Path d="M24 36 C30 32 36 33 38 36 C34 40 28 40 24 36 Z" fill={palette.leaf} />
      <Circle cx={24} cy={20} r={11} fill="#D7263D" />
      <Line
        d="M24 14 C28 14 30 18 28 21 C26 24 21 23 21 20 C21 17 24 16 26 18 M15 22 C16 28 22 31 28 30"
        stroke="#A61E30"
        width={1.5}
      />
    </>
  ),
  sesame: (
    <>
      <Oval cx={18} cy={19} rx={5} ry={11} angle={-10} fill="#A9B85A" />
      <Oval cx={30} cy={17} rx={5} ry={11} angle={12} fill="#8FA148" />
      <Line d="M18 9 L18 29 M30 7 L29 27" stroke="#7C8C3A" width={1} />
      {[
        [12, 37, -20],
        [18, 41, 10],
        [23, 36, 30],
        [28, 42, -10],
        [33, 37, 20],
        [38, 42, -30],
      ].map(([cx, cy, angle]) => (
        <Oval key={`${cx}:${cy}`} cx={cx} cy={cy} rx={1.6} ry={2.4} angle={angle} fill="#F1E3C0" />
      ))}
    </>
  ),
  sorghum: (
    <>
      <Line d="M24 46 V26" stroke="#8BAF3A" width={2.5} />
      <Path d="M24 34 C32 32 38 26 40 20 C34 22 28 26 24 32 Z" fill={palette.leaf} />
      {[
        [24, 6, '#B5533C'],
        [20, 10, '#C8663F'],
        [28, 10, '#B5533C'],
        [17, 15, '#B5533C'],
        [24, 14, '#C8663F'],
        [31, 15, '#C8663F'],
        [20, 20, '#B5533C'],
        [28, 20, '#B5533C'],
        [24, 24, '#C8663F'],
      ].map(([cx, cy, fill]) => (
        <Circle key={`${cx}:${cy}`} cx={cx as number} cy={cy as number} r={3.4} fill={fill as string} />
      ))}
    </>
  ),
  soybean: (
    <>
      <Path d="M10 36 C8 30 14 22 22 18 L32 12 C37 9 42 12 40 17 C38 22 32 26 26 30 L18 36 C15 38.5 11 39 10 36 Z" fill="#B8B05A" />
      <Circle cx={16} cy={31} r={3.4} fill="#CFC77A" />
      <Circle cx={24} cy={25} r={3.4} fill="#CFC77A" />
      <Circle cx={32} cy={19} r={3.4} fill="#CFC77A" />
      <Oval cx={34} cy={37} rx={4} ry={3.5} fill="#E6CF8E" />
      <Oval cx={41} cy={31} rx={3.5} ry={3} fill="#E6CF8E" />
    </>
  ),
  strawberry: (
    <>
      <Line d="M24 14 V8" stroke={palette.darkLeaf} />
      <Path d="M24 42 C14 36 8 28 10 20 C11 15 16 13 24 15 C32 13 37 15 38 20 C40 28 34 36 24 42 Z" fill="#E0343F" />
      {[
        [17, 22],
        [24, 21],
        [31, 22],
        [14, 28],
        [21, 27],
        [28, 27],
        [34, 28],
        [18, 33],
        [25, 33],
        [30, 33],
        [22, 38],
      ].map(([cx, cy]) => (
        <Oval key={`${cx}:${cy}`} cx={cx} cy={cy} rx={0.8} ry={1.3} fill="#F6D365" />
      ))}
      <Path d="M14 16 C18 12 22 14 24 16 C26 14 30 12 34 16 C30 19 27 18 24 18 C21 18 18 19 14 16 Z" fill={palette.leaf} />
    </>
  ),
  sugar_beet: (
    <>
      <Path d="M22 20 C16 14 14 8 16 3 C21 7 23 13 23 20 Z" fill={palette.leaf} />
      <Path d="M26 20 C28 12 32 7 37 5 C36 11 32 16 27 21 Z" fill={palette.darkLeaf} />
      <Path d="M24 20 C22 13 23 7 26 3 C28 9 27 15 25 20 Z" fill={palette.lightLeaf} />
      <Path d="M16 22 C16 18 32 18 32 22 C32 30 28 38 24 45 C20 38 16 30 16 22 Z" fill="#F1E6D3" stroke="#D9C8A8" strokeWidth={1} />
      <Line d="M18 28 C21 29 27 29 30 28 M20 34 C22 35 26 35 28 34" stroke="#D9C8A8" width={1} />
    </>
  ),
  sugarcane: (
    <>
      <Rect x={14} y={4} width={6} height={40} rx={3} fill="#7FB33F" />
      <Rect x={26} y={8} width={6} height={38} rx={3} fill="#96C24D" />
      <Line d="M14 14 H20 M14 24 H20 M14 34 H20 M26 18 H32 M26 28 H32 M26 38 H32" stroke="#5A8A2A" />
      <Path d="M20 14 C28 10 36 10 42 14 C36 16 28 16 20 14 Z" fill={palette.leaf} />
      <Path d="M14 24 C8 20 4 14 4 8 C10 12 13 18 14 24 Z" fill={palette.darkLeaf} />
    </>
  ),
  sunflower: (
    <>
      <Line d="M24 29 V46" stroke={palette.darkLeaf} width={2.5} />
      <Path d="M24 38 C30 33 38 34 40 37 C35 42 28 42 24 38 Z" fill={palette.leaf} />
      <PetalRing cx={24} cy={20} count={12} radius={10} rx={3} ry={6} fill={palette.yellow} />
      <Circle cx={24} cy={20} r={7} fill="#6B4423" />
      <Speckles cx={24} cy={20} rx={6} ry={6} step={2.5} r={0.7} fill={palette.brown} />
    </>
  ),
  taro: (
    <>
      <Line d="M24 18 C25 12 28 8 32 6" stroke={palette.leaf} />
      <Path d="M32 6 C36 2 44 3 44 9 C44 14 38 16 32 15 C34 12 34 9 32 6 Z" fill={palette.leaf} />
      <Path d="M12 30 C12 22 18 18 24 18 C30 18 36 22 36 30 C36 38 30 43 24 43 C18 43 12 38 12 30 Z" fill="#8C6A4F" />
      <Line d="M13 26 C20 28 28 28 35 26 M12.5 33 C20 35 28 35 35.5 33 M15 39 C21 41 27 41 33 39" stroke="#6E5038" width={1.2} />
    </>
  ),
  tea: (
    <>
      <Line d="M20 44 C22 34 24 24 26 12" stroke="#5A7A2A" />
      <Path d="M26 12 C24 8 25 4 28 2 C30 6 29 10 26 12 Z" fill="#8BC34A" />
      <Path d="M25 22 C31 16 40 16 44 20 C40 27 31 28 25 22 Z" fill="#4CAF50" />
      <Path d="M23 30 C16 24 8 25 4 29 C9 35 17 36 23 30 Z" fill="#388E3C" />
      <Line d="M27 22 C32 21 37 21 42 20 M21 30 C16 29 11 29 6 29" stroke="#8BC34A" width={0.9} />
    </>
  ),
  tobacco: (
    <>
      <Path d="M24 44 C12 38 6 26 10 14 C13 6 20 4 24 4 C28 4 35 6 38 14 C42 26 36 38 24 44 Z" fill="#6FA842" />
      <Line d="M24 44 V8" stroke="#4E8030" width={1.8} />
      <Line
        d="M24 16 L16 12 M24 22 L13 19 M24 28 L14 27 M24 34 L17 35 M24 16 L32 12 M24 22 L35 19 M24 28 L34 27 M24 34 L31 35"
        stroke="#8CC45E"
        width={1.2}
      />
    </>
  ),
  tomato: (
    <>
      <Path d="M24 14 C34 13 40 20 40 28 C40 37 33 42 24 42 C15 42 8 37 8 28 C8 20 14 13 24 14 Z" fill="#E53935" />
      <Oval cx={16} cy={26} rx={2.5} ry={4.5} fill={palette.white} opacity={0.3} />
      <Path d="M24 12 L26 16.5 L31 15 L28 19 L32 22 L26.5 21 L24 25 L21.5 21 L16 22 L20 19 L17 15 L22 16.5 Z" fill="#43A047" />
      <Line d="M24 12 V7" stroke="#2E7D32" width={2.5} />
    </>
  ),
  turmeric: (
    <>
      <Path d="M22 28 C22 34 26 40 30 40 C33 40 34 37 32 34 C30 32 28 30 28 27 Z" fill="#B77A33" />
      <Path
        d="M6 28 C6 22 12 20 16 22 L30 18 C34 12 42 14 42 20 C42 25 38 28 34 27 L20 32 C18 37 10 37 8 33 C6.5 32 6 30 6 28 Z"
        fill="#C7863A"
      />
      <Line d="M16 22 C17 25 17 28 16 31 M30 18 C31 21 31 24 30 27" stroke="#9E6524" width={1.2} />
      <Oval cx={40} cy={21} rx={3} ry={4.5} fill="#F59E1B" />
      <Circle cx={31.5} cy={37.5} r={2.5} fill="#F59E1B" />
    </>
  ),
  wheat: (
    <>
      <Line d="M24 46 V20" stroke={palette.straw} />
      <Path d="M24 38 C18 36 12 38 8 42 C14 44 20 42 24 40 Z" fill={palette.straw} />
      {[33, 27, 21, 15].map((cy) => (
        <G key={cy}>
          <Oval cx={20.5} cy={cy} rx={3} ry={4.6} angle={-30} fill={palette.grain} />
          <Oval cx={27.5} cy={cy} rx={3} ry={4.6} angle={30} fill={palette.grain} />
        </G>
      ))}
      <Oval cx={24} cy={9} rx={2.8} ry={4.4} fill={palette.grain} />
    </>
  ),
  zucchini: (
    <>
      <Path d="M10 36 C8 34 9 30 13 27 L30 11 C33 8.5 37 8.5 39 11 C41 13.5 40 17 37 19 L19 35 C16 38 12 38.5 10 36 Z" fill="#3D7A2E" />
      <Line d="M14 31 L33 14 M17 34 L36 17" stroke="#6DA84C" width={1.3} />
      <Path d="M36 9 L40 5 L43 8 L39 12 Z" fill="#8BAF3A" />
      <Circle cx={35} cy={35} r={8} fill="#3D7A2E" />
      <Circle cx={35} cy={35} r={6.6} fill="#E6F0B8" />
      <Speckles cx={35} cy={35} rx={3.5} ry={3.5} step={2.2} r={0.6} fill="#B9C98A" />
    </>
  ),
};

type CropIconProps = {
  id: CropId;
  size: number;
};

export function CropIcon({ id, size }: CropIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {ICONS[id]}
    </Svg>
  );
}
