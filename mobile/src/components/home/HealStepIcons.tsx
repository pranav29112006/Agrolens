import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { colors } from '@/constants/colors';

// Small 64×64 illustrations for the "take a picture → diagnosis → treatment" card.
const ink = '#22302A';
const leaf = '#4CAF72';
const leafVein = '#2E7D4F';
const blight = '#9A6B3F';

type IconProps = { size: number };

export function PictureStepIcon({ size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={18} y={5} width={28} height={54} rx={6} fill={ink} />
      <Rect x={21} y={10} width={22} height={42} rx={3} fill={colors.surface} />
      <Path
        d="M24 18 V14 H28 M36 14 H40 V18 M40 44 V48 H36 M28 48 H24 V44"
        stroke={colors.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M32 20 C40 25 40 36 32 42 C24 36 24 25 32 20 Z" fill={leaf} />
      <Path d="M32 23 V40" stroke={leafVein} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function DiagnosisStepIcon({ size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M30 58 V18" stroke={leafVein} strokeWidth={3} strokeLinecap="round" />
      <Path d="M30 30 C20 30 13 23 13 15 C23 15 30 22 30 30 Z" fill={leaf} />
      <Path d="M30 40 C40 40 48 34 49 25 C39 25 31 31 30 40 Z" fill={leaf} />
      <Path d="M30 22 C30 14 35 8 42 7 C42 15 37 21 30 22 Z" fill={leaf} />
      <Circle cx={20} cy={20} r={2} fill={blight} />
      <Circle cx={41} cy={31} r={1.8} fill={blight} />
      <Circle cx={46} cy={49} r={10} fill={colors.primary} />
      <Path
        d="M41 49 L44.5 52.5 L51 46"
        stroke={colors.onPrimary}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function TreatmentStepIcon({ size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={20} y={28} width={24} height={32} rx={7} fill={colors.accent} />
      <Rect x={26} y={20} width={12} height={10} rx={2} fill="#D99A22" />
      <Path d="M22 12 H44 L46 20 H24 Z" fill={ink} />
      <Path d="M24 20 L20 30" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      <Rect x={44} y={13} width={8} height={4} rx={2} fill={ink} />
      <Circle cx={56} cy={11} r={1.6} fill={colors.primary} />
      <Circle cx={59} cy={16} r={1.6} fill={colors.primary} />
      <Circle cx={56} cy={20} r={1.4} fill={colors.primary} />
      <Ellipse cx={32} cy={44} rx={6} ry={8} fill={colors.surface} opacity={0.35} />
    </Svg>
  );
}
