import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/constants/colors';

// All illustrations share one coordinate space and scale to the width they are given.
const VIEWBOX_WIDTH = 300;
const VIEWBOX_HEIGHT = 260;

const BLOB = 'M150 18 C212 14 270 52 276 118 C282 182 238 238 168 244 C98 250 30 222 22 150 C14 82 88 22 150 18 Z';

const ink = '#22302A';
const leaf = '#4CAF72';
const leafVein = '#2E7D4F';
const blight = '#9A6B3F';
const amberSoft = '#FBE3B0';
const mapLight = '#D3E8D9';
const mapDark = '#BFDDC8';
const placeholderLine = '#E5E0D3';

type IllustrationProps = {
  width: number;
};

function Frame({ width, children }: IllustrationProps & { children: ReactNode }) {
  return (
    <Svg
      width={width}
      height={(width * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
    >
      <Path d={BLOB} fill={colors.primaryTint} />
      {children}
    </Svg>
  );
}

/** Four-pointed sparkle centred on (cx, cy). */
function sparkle(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}

function Tick({ x, y, color = colors.onPrimary }: { x: number; y: number; color?: string }) {
  return (
    <Path
      d={`M${x - 6} ${y} L${x - 1.5} ${y + 4.5} L${x + 6} ${y - 4}`}
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** Phone scanning a blighted leaf, with a lens confirming the result. */
export function DetectIllustration({ width }: IllustrationProps) {
  return (
    <Frame width={width}>
      <Rect x={100} y={34} width={104} height={188} rx={18} fill={ink} />
      <Rect x={108} y={46} width={88} height={164} rx={10} fill={colors.surface} />

      <Path d="M152 78 C188 98 190 150 152 180 C114 150 116 98 152 78 Z" fill={leaf} />
      <Path d="M152 86 L152 174" stroke={leafVein} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={140} cy={116} r={6} fill={blight} />
      <Circle cx={165} cy={136} r={5} fill={blight} />
      <Circle cx={145} cy={152} r={4} fill={blight} />

      <Path
        d="M118 70 V60 H130 M174 60 H186 V70 M186 186 V196 H174 M130 196 H118 V186"
        stroke={colors.accent}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M116 128 H188" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" />

      <Path d="M236 196 L262 222" stroke={colors.primary} strokeWidth={12} strokeLinecap="round" />
      <Circle cx={216} cy={176} r={30} fill={colors.surface} stroke={colors.primary} strokeWidth={8} />
      <Path
        d="M203 176 L212 185 L230 167"
        stroke={colors.primary}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <Path d={sparkle(62, 72, 12)} fill={colors.accent} />
      <Path d={sparkle(250, 60, 8)} fill={colors.primary} />
      <Path d={sparkle(58, 196, 7)} fill={colors.primary} />
    </Frame>
  );
}

/** Checklist treatment plan next to a prevention shield. */
export function TreatIllustration({ width }: IllustrationProps) {
  const steps = [
    { y: 118, length: 72 },
    { y: 152, length: 56 },
    { y: 186, length: 64 },
  ];

  return (
    <Frame width={width}>
      <Rect
        x={70}
        y={44}
        width={140}
        height={184}
        rx={16}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={2}
      />
      <Rect x={112} y={32} width={56} height={24} rx={8} fill={colors.primary} />

      <Circle cx={98} cy={82} r={14} fill={colors.primaryTint} />
      <Path d="M98 72 C108 78 108 90 98 94 C88 90 88 78 98 72 Z" fill={leaf} />
      <Rect x={120} y={76} width={70} height={12} rx={6} fill={colors.onPrimaryMuted} />

      {steps.map(({ y, length }) => (
        <G key={y}>
          <Circle cx={96} cy={y} r={11} fill={colors.primary} />
          <Tick x={96} y={y} />
          <Rect x={116} y={y - 5} width={length} height={10} rx={5} fill={placeholderLine} />
        </G>
      ))}

      <Path
        d="M238 108 L274 122 V156 C274 182 258 200 238 210 C218 200 202 182 202 156 V122 Z"
        fill={colors.accent}
      />
      <Path d="M238 132 C256 142 256 166 238 180 C220 166 220 142 238 132 Z" fill={colors.surface} />
      <Path d="M238 138 L238 174" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" />

      <Path d={sparkle(48, 60, 10)} fill={colors.accent} />
      <Path d={sparkle(262, 70, 8)} fill={colors.primary} />
      <Path d={sparkle(40, 206, 7)} fill={colors.primary} />
    </Frame>
  );
}

/** Greeting bubbles in Hindi, English and Tamil. */
export function LanguageIllustration({ width }: IllustrationProps) {
  return (
    <Frame width={width}>
      <Rect x={36} y={44} width={132} height={74} rx={22} fill={colors.primary} />
      <Path d="M62 110 L54 140 L90 114 Z" fill={colors.primary} />
      <SvgText
        x={102}
        y={90}
        fontSize={26}
        fontFamily="sans-serif"
        fontWeight="700"
        fill={colors.onPrimary}
        textAnchor="middle"
      >
        नमस्ते
      </SvgText>

      <Path
        d="M222 166 L250 194 L242 166 Z"
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Rect
        x={144}
        y={104}
        width={122}
        height={68}
        rx={22}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={2}
      />
      <SvgText
        x={205}
        y={146}
        fontSize={24}
        fontFamily="sans-serif"
        fontWeight="700"
        fill={colors.textPrimary}
        textAnchor="middle"
      >
        Hello
      </SvgText>

      <Rect x={58} y={170} width={128} height={58} rx={20} fill={colors.accent} />
      <Path d="M86 222 L78 248 L108 224 Z" fill={colors.accent} />
      <SvgText
        x={122}
        y={205}
        fontSize={18}
        fontFamily="sans-serif"
        fontWeight="700"
        fill={colors.textPrimary}
        textAnchor="middle"
      >
        வணக்கம்
      </SvgText>

      <Path d={sparkle(262, 64, 11)} fill={colors.accent} />
      <Path d={sparkle(214, 218, 7)} fill={colors.primary} />
      <Path d={sparkle(28, 150, 7)} fill={colors.primary} />
    </Frame>
  );
}

/** One scene covering all three answers: a pot, a house with a garden bed, and field rows. */
export function GrowerIllustration({ width }: IllustrationProps) {
  return (
    <Frame width={width}>
      <Circle cx={238} cy={62} r={18} fill={colors.accent} />
      <Path
        d="M24 176 C80 150 140 158 190 150 C230 144 262 150 278 158 L278 222 C220 244 90 246 24 222 Z"
        fill={mapLight}
      />

      {/* Fields */}
      <Path
        d="M190 168 L262 160 M186 182 L270 172 M184 196 L274 186 M186 210 L270 200"
        stroke={leaf}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />

      {/* House with a garden bed */}
      <Rect x={96} y={112} width={62} height={52} fill={colors.surface} stroke={colors.border} strokeWidth={2} />
      <Path d="M88 116 L127 84 L166 116 Z" fill={colors.primary} />
      <Rect x={120} y={136} width={14} height={28} rx={2} fill="#C4623A" />
      <Rect x={104} y={124} width={12} height={12} fill={colors.primaryTint} />
      <Rect x={140} y={124} width={12} height={12} fill={colors.primaryTint} />
      <Rect x={98} y={170} width={66} height={14} rx={4} fill="#8B5A2B" />
      {[110, 124, 138, 152].map((x) => (
        <G key={x}>
          <Path d={`M${x} 170 V161`} stroke={leafVein} strokeWidth={2} strokeLinecap="round" />
          <Ellipse
            cx={x - 3}
            cy={162}
            rx={3.2}
            ry={1.8}
            fill={leaf}
            transform={`rotate(-30 ${x - 3} 162)`}
          />
          <Ellipse
            cx={x + 3}
            cy={160}
            rx={3.2}
            ry={1.8}
            fill={leaf}
            transform={`rotate(30 ${x + 3} 160)`}
          />
        </G>
      ))}

      {/* Pot */}
      <Path d="M58 172 V146" stroke={leafVein} strokeWidth={3} strokeLinecap="round" />
      <Path d="M58 158 C48 158 42 150 42 142 C52 142 58 150 58 158 Z" fill={leaf} />
      <Path d="M58 151 C58 141 66 135 74 136 C74 145 68 151 58 151 Z" fill={leaf} />
      <Path d="M40 178 H76 L71 208 H45 Z" fill="#D9774B" />
      <Rect x={37} y={171} width={42} height={9} rx={3} fill="#C4623A" />

      <Path d={sparkle(44, 88, 9)} fill={colors.accent} />
      <Path d={sparkle(190, 110, 7)} fill={colors.primary} />
    </Frame>
  );
}

/** Map pin with a sprout over a folded field map, with a weather badge for local conditions. */
export function LocationIllustration({ width }: IllustrationProps) {
  return (
    <Frame width={width}>
      <Path d="M50 172 L120 150 L120 222 L50 244 Z" fill={mapLight} />
      <Path d="M120 150 L190 172 L190 244 L120 222 Z" fill={mapDark} />
      <Path d="M190 172 L260 150 L260 222 L190 244 Z" fill={mapLight} />
      <Path
        d="M60 222 C96 204 134 236 174 214 S236 190 252 196"
        stroke={colors.surface}
        strokeWidth={4}
        strokeDasharray="8 7"
        strokeLinecap="round"
        fill="none"
      />

      <Ellipse cx={155} cy={204} rx={20} ry={6} fill={ink} opacity={0.15} />
      <Path
        d="M155 200 C130 168 109 140 109 100 A46 46 0 1 1 201 100 C201 140 180 168 155 200 Z"
        fill={colors.primary}
      />
      <Circle cx={155} cy={100} r={28} fill={colors.surface} />
      <Path d="M155 118 V96" stroke={leafVein} strokeWidth={4} strokeLinecap="round" />
      <Path d="M155 102 C142 102 133 93 133 82 C146 82 155 90 155 102 Z" fill={leaf} />
      <Path d="M155 96 C155 83 165 74 177 75 C177 88 168 96 155 96 Z" fill={leaf} />

      <Circle cx={226} cy={64} r={26} fill={amberSoft} />
      <Circle cx={217} cy={57} r={9} fill={colors.accent} />
      <Circle cx={223} cy={72} r={7} fill={colors.surface} />
      <Circle cx={233} cy={67} r={9} fill={colors.surface} />
      <Circle cx={242} cy={73} r={6} fill={colors.surface} />
      <Rect x={216} y={72} width={32} height={8} rx={4} fill={colors.surface} />

      <Path d={sparkle(60, 80, 10)} fill={colors.accent} />
      <Path d={sparkle(262, 120, 8)} fill={colors.primary} />
      <Path d={sparkle(44, 140, 6)} fill={colors.primary} />
    </Frame>
  );
}

/** "My crops" list with per-crop health status, plus a growth chart card. */
export function CropsIllustration({ width }: IllustrationProps) {
  const crops = [
    { y: 104, avatar: colors.primaryTint, healthy: true },
    { y: 144, avatar: amberSoft, healthy: false },
    { y: 184, avatar: colors.primaryTint, healthy: true },
  ];
  const bars = [
    { x: 222, height: 14, fill: colors.onPrimaryMuted },
    { x: 237, height: 22, fill: colors.onPrimaryMuted },
    { x: 252, height: 30, fill: colors.onPrimaryMuted },
    { x: 267, height: 40, fill: colors.accent },
  ];

  return (
    <Frame width={width}>
      <Rect
        x={50}
        y={36}
        width={172}
        height={192}
        rx={18}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth={2}
      />
      <Rect x={70} y={56} width={78} height={12} rx={6} fill={colors.onPrimaryMuted} />
      <Circle cx={198} cy={62} r={13} fill={colors.primary} />
      <Path
        d="M198 55 V69 M191 62 H205"
        stroke={colors.onPrimary}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {crops.map(({ y, avatar, healthy }) => (
        <G key={y}>
          <Circle cx={84} cy={y} r={16} fill={avatar} />
          <Path
            d={`M84 ${y - 9} C93 ${y - 4} 93 ${y + 5} 84 ${y + 9} C75 ${y + 5} 75 ${y - 4} 84 ${y - 9} Z`}
            fill={leaf}
          />
          <Rect x={110} y={y - 9} width={58} height={8} rx={4} fill={placeholderLine} />
          <Rect x={110} y={y + 3} width={38} height={6} rx={3} fill={placeholderLine} />
          <Circle cx={196} cy={y} r={10} fill={healthy ? colors.primary : colors.accent} />
          {healthy ? (
            <Tick x={196} y={y} />
          ) : (
            <G>
              <Path
                d={`M196 ${y - 5} V${y + 1}`}
                stroke={colors.onPrimary}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Circle cx={196} cy={y + 5} r={1.8} fill={colors.onPrimary} />
            </G>
          )}
        </G>
      ))}

      <Rect x={210} y={148} width={76} height={80} rx={14} fill={colors.primary} />
      <Rect x={222} y={162} width={32} height={6} rx={3} fill={colors.onPrimaryMuted} />
      {bars.map(({ x, height, fill }) => (
        <Rect key={x} x={x} y={214 - height} width={10} height={height} rx={3} fill={fill} />
      ))}

      <Path d={sparkle(34, 64, 10)} fill={colors.accent} />
      <Path d={sparkle(262, 40, 8)} fill={colors.primary} />
      <Path d={sparkle(30, 206, 7)} fill={colors.primary} />
    </Frame>
  );
}
