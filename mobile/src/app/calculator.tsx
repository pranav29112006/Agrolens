import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { useStrings, type Strings } from '@/i18n';

type Kind = 'pesticide' | 'fertilizer' | 'farming';
type CalculatorStrings = Strings['calculator'];
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AreaUnit = 'acre' | 'hectare' | 'gunta';
// A gunta is a fortieth of an acre.
const ACRES_PER_UNIT: Record<AreaUnit, number> = { acre: 1, hectare: 2.471, gunta: 1 / 40 };
const UNIT_SHORT: Record<AreaUnit, string> = { acre: 'ac', hectare: 'ha', gunta: 'gunta' };
const HECTARES_PER_ACRE = 0.4047;
const AREA_STEP = 0.5;

// Share of each nutrient in the common fertilisers: urea is 46% N, DAP is 18% N
// and 46% P2O5, and MOP (muriate of potash) is 60% K2O.
const UREA_N = 0.46;
const DAP_N = 0.18;
const DAP_P = 0.46;
const MOP_K = 0.6;

const RECENT_LIMIT = 5;
/** Shown where a sum has no answer, e.g. a price per kg with no harvest. */
const NO_ANSWER = '—';

type Outcome = { label: string; value: string };

/** Blank or invalid input counts as zero. */
function toNumber(text: string) {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function format(value: number, digits = 1) {
  return value.toLocaleString('en', { maximumFractionDigits: digits });
}

/** The last few results of one calculator, kept on the device so they can be compared. */
function useRecent(kind: Kind) {
  const key = `agrolens.calculations.${kind}`;
  const [recent, setRecent] = useState<Outcome[][]>([]);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((stored) => setRecent(stored ? JSON.parse(stored) : []))
      .catch(() => setRecent([]));
  }, [key]);

  const remember = (outcomes: Outcome[]) => {
    // Nothing worth keeping: no answer, all zeros from an empty form, or the same one as last time.
    const hasAnswer = outcomes.some((outcome) => outcome.value !== NO_ANSWER && !/^0( |$)/.test(outcome.value));
    if (!hasAnswer || JSON.stringify(outcomes) === JSON.stringify(recent[0])) return;
    const next = [outcomes, ...recent].slice(0, RECENT_LIMIT);
    setRecent(next);
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  };
  return { recent, remember };
}

/** The three home-screen tools. They only do arithmetic: the doses, prices and amounts are the farmer's to enter. */
export default function CalculatorScreen() {
  const strings = useStrings();
  const { kind } = useLocalSearchParams<{ kind: Kind }>();

  const titles: Record<Kind, string> = {
    pesticide: strings.home.pesticideCalculator,
    fertilizer: strings.home.fertilizerCalculator,
    farming: strings.home.farmingCalculator,
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={titles[kind] ?? titles.pesticide} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {kind === 'fertilizer' && <Fertilizer text={strings.calculator} />}
        {kind === 'farming' && <Farming text={strings.calculator} />}
        {kind !== 'fertilizer' && kind !== 'farming' && <Pesticide text={strings.calculator} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Product for an area, and how to split it across sprayer refills. */
function Pesticide({ text }: { text: CalculatorStrings }) {
  const { recent, remember } = useRecent('pesticide');
  const [area, setArea] = useState('1');
  const [unit, setUnit] = useState<AreaUnit>('acre');
  const [dose, setDose] = useState('');
  const [water, setWater] = useState('');
  const [pump, setPump] = useState('20');
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  const calculate = () => {
    const product = toNumber(dose) * toNumber(area);
    const refills = toNumber(pump) > 0 ? (toNumber(water) * toNumber(area)) / toNumber(pump) : 0;
    const result = [
      { label: text.productNeeded, value: `${format(product)} ml / g` },
      // Less than one sprayer of water still takes all the product.
      { label: text.dosePerRefill, value: `${format(refills > 1 ? product / refills : product)} ml / g` },
      { label: text.pumpRefills, value: format(Math.ceil(refills), 0) },
    ];
    setOutcomes(result);
    remember(result);
  };

  return (
    <>
      <Text style={styles.hint}>{text.pesticideHint}</Text>
      <Outcomes outcomes={outcomes} placeholders={[text.productNeeded, text.dosePerRefill, text.pumpRefills]} />
      <Area text={text} area={area} onArea={setArea} unit={unit} onUnit={setUnit} />
      <Field label={text.productDose} suffix={`ml / g / ${UNIT_SHORT[unit]}`} value={dose} onChange={setDose} />
      <Field label={text.waterAmount} suffix={`l / ${UNIT_SHORT[unit]}`} value={water} onChange={setWater} />
      <Field label={text.pumpSize} suffix="l" value={pump} onChange={setPump} />
      <CalculateButton label={text.calculate} onPress={calculate} />
      <Recent text={text} recent={recent} />
    </>
  );
}

/** Urea, DAP and MOP that supply a recommended amount of N, P and K. */
function Fertilizer({ text }: { text: CalculatorStrings }) {
  const { recent, remember } = useRecent('fertilizer');
  const [area, setArea] = useState('1');
  const [unit, setUnit] = useState<AreaUnit>('acre');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  const calculate = () => {
    const hectares = toNumber(area) * ACRES_PER_UNIT[unit] * HECTARES_PER_ACRE;
    // DAP covers the phosphorus and brings some nitrogen with it; urea supplies the rest.
    const dap = (toNumber(phosphorus) / DAP_P) * hectares;
    const urea = Math.max(0, toNumber(nitrogen) * hectares - dap * DAP_N) / UREA_N;
    const mop = (toNumber(potassium) / MOP_K) * hectares;
    const result = [
      { label: 'Urea', value: `${format(urea)} kg` },
      { label: 'DAP', value: `${format(dap)} kg` },
      { label: 'MOP', value: `${format(mop)} kg` },
    ];
    setOutcomes(result);
    remember(result);
  };

  return (
    <>
      <Text style={styles.hint}>{text.fertilizerHint}</Text>
      <Outcomes outcomes={outcomes} placeholders={['Urea', 'DAP', 'MOP']} />
      <Field label={text.nitrogen} suffix="kg" value={nitrogen} onChange={setNitrogen} />
      <Field label={text.phosphorus} suffix="kg" value={phosphorus} onChange={setPhosphorus} />
      <Field label={text.potassium} suffix="kg" value={potassium} onChange={setPotassium} />
      <Area text={text} area={area} onArea={setArea} unit={unit} onUnit={setUnit} />
      <CalculateButton label={text.calculate} onPress={calculate} />
      <Recent text={text} recent={recent} />
    </>
  );
}

type Sum = 'profit' | 'budget' | 'requiredYield' | 'noLossPrice';
type Input = 'expectedYield' | 'sellingPrice' | 'expenses' | 'targetProfit';

const SUMS: { id: Sum; icon: IconName; body: `${Sum}Body`; inputs: Input[] }[] = [
  { id: 'profit', icon: 'chart-line', body: 'profitBody', inputs: ['expectedYield', 'sellingPrice', 'expenses'] },
  { id: 'budget', icon: 'cash-multiple', body: 'budgetBody', inputs: ['expectedYield', 'sellingPrice', 'targetProfit'] },
  { id: 'requiredYield', icon: 'sprout-outline', body: 'requiredYieldBody', inputs: ['expenses', 'sellingPrice'] },
  { id: 'noLossPrice', icon: 'storefront-outline', body: 'noLossPriceBody', inputs: ['expenses', 'expectedYield'] },
];

/** Four sums on a season's money: profit, input budget, break-even yield and break-even price. */
function Farming({ text }: { text: CalculatorStrings }) {
  const { recent, remember } = useRecent('farming');
  const [sumId, setSumId] = useState<Sum>('profit');
  const [values, setValues] = useState<Record<Input, string>>({
    expectedYield: '',
    sellingPrice: '',
    expenses: '',
    targetProfit: '',
  });
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const sum = SUMS.find((candidate) => candidate.id === sumId) ?? SUMS[0];

  const calculate = () => {
    const harvest = toNumber(values.expectedYield);
    const price = toNumber(values.sellingPrice);
    const expenses = toNumber(values.expenses);
    const answers: Record<Sum, string> = {
      profit: format(harvest * price - expenses, 0),
      budget: format(harvest * price - toNumber(values.targetProfit), 0),
      requiredYield: price > 0 ? `${format(expenses / price, 0)} kg` : NO_ANSWER,
      noLossPrice: harvest > 0 ? format(expenses / harvest, 2) : NO_ANSWER,
    };
    const result = [{ label: text[sum.id], value: answers[sum.id] }];
    setOutcomes(result);
    remember(result);
  };

  return (
    <>
      <Text style={styles.heading}>{text.chooseCalculation}</Text>
      <View style={styles.sums}>
        {SUMS.map(({ id, icon, body }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: id === sumId }}
            onPress={() => {
              setSumId(id);
              setOutcomes(null);
            }}
            style={[styles.sum, id === sumId && styles.sumSelected]}
          >
            <View style={styles.sumIcon}>
              <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.sumTitle}>{text[id]}</Text>
            <Text style={styles.sumBody}>{text[body]}</Text>
          </Pressable>
        ))}
      </View>

      <Outcomes outcomes={outcomes} placeholders={[text[sum.id]]} />
      {sum.inputs.map((input) => (
        <Field
          key={input}
          label={text[input]}
          value={values[input]}
          onChange={(value) => setValues((current) => ({ ...current, [input]: value }))}
        />
      ))}
      <CalculateButton label={text.calculate} onPress={calculate} />
      <Recent text={text} recent={recent} />
    </>
  );
}

/** The answers, or dashes under their labels until something has been calculated. */
function Outcomes({ outcomes, placeholders }: { outcomes: Outcome[] | null; placeholders: string[] }) {
  const shown = outcomes ?? placeholders.map((label) => ({ label, value: NO_ANSWER }));
  const [main, ...others] = shown;

  return (
    <View style={styles.outcomes}>
      <View style={styles.outcomeMain}>
        <Text style={styles.outcomeLabel}>{main.label}</Text>
        <Text style={styles.outcomeMainValue}>{main.value}</Text>
      </View>
      {others.length > 0 && (
        <View style={styles.outcomeRow}>
          {others.map((outcome) => (
            <View key={outcome.label} style={styles.outcome}>
              <Text style={styles.outcomeLabel}>{outcome.label}</Text>
              <Text style={styles.outcomeValue}>{outcome.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type AreaProps = {
  text: CalculatorStrings;
  area: string;
  onArea: (value: string) => void;
  unit: AreaUnit;
  onUnit: (unit: AreaUnit) => void;
};

function Area({ text, area, onArea, unit, onUnit }: AreaProps) {
  const units: { id: AreaUnit; label: string }[] = [
    { id: 'acre', label: text.acres },
    { id: 'hectare', label: text.hectares },
    { id: 'gunta', label: text.gunta },
  ];
  const step = (change: number) => onArea(format(Math.max(AREA_STEP, toNumber(area) + change)));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{text.area}</Text>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel="−" onPress={() => step(-AREA_STEP)} style={styles.step}>
          <MaterialCommunityIcons name="minus" size={24} color={colors.primary} />
        </Pressable>
        <TextInput
          value={area}
          onChangeText={onArea}
          keyboardType="decimal-pad"
          style={[styles.input, styles.areaInput]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="+" onPress={() => step(AREA_STEP)} style={styles.step}>
          <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.units}>
        {units.map(({ id, label }) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ selected: id === unit }}
            onPress={() => onUnit(id)}
            style={[styles.unit, id === unit && styles.unitSelected]}
          >
            <Text style={[styles.unitText, id === unit && styles.unitTextSelected]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type FieldProps = {
  label: string;
  /** The unit, shown inside the box. */
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({ label, suffix, value, onChange }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.radio}
          style={[styles.input, styles.inputGrow]}
        />
        {suffix !== undefined && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

function CalculateButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.calculate}>
      <Text style={styles.calculateText}>{label}</Text>
    </Pressable>
  );
}

function Recent({ text, recent }: { text: CalculatorStrings; recent: Outcome[][] }) {
  return (
    <View style={styles.recent}>
      <Text style={styles.recentTitle}>{text.recent}</Text>
      {recent.length === 0 && <Text style={styles.hint}>{text.recentEmpty}</Text>}
      {recent.map((outcomes, index) => (
        // Results are only ever added at the front, so the position identifies them.
        <View key={recent.length - index} style={styles.recentRow}>
          {outcomes.map((outcome) => (
            <Text key={outcome.label} style={styles.recentText}>
              {outcome.label}: <Text style={styles.recentValue}>{outcome.value}</Text>
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  sums: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sum: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sumSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  sumIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  sumTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sumBody: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  outcomes: {
    gap: 10,
  },
  outcomeMain: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outcome: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
  },
  outcomeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  outcomeMainValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  outcomeValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 17,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputGrow: {
    flex: 1,
  },
  suffix: {
    minWidth: 28,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  step: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  areaInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  units: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  unit: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unitSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  unitText: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  unitTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  calculate: {
    height: 52,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  calculateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  recent: {
    gap: 8,
    marginTop: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recentRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recentText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  recentValue: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
