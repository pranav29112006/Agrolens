import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SourceLinks } from '@/components/diagnosis/DiagnosisCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { ApiError, askAssistant, type AssistantAnswer } from '@/lib/api';

type Message = {
  id: number;
  from: 'farmer' | 'assistant';
  text: string;
  sources?: AssistantAnswer['sources'];
};

/** Chat with the Assistant, which answers from the backend's knowledge base. */
export default function AssistantScreen() {
  const strings = useStrings();
  const { crops, language } = usePreferences();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const question = draft.trim();
  const canSend = question.length >= 2 && !isWaiting;

  const send = async () => {
    if (!canSend) return;
    setDraft('');
    setIsWaiting(true);
    setMessages((current) => [...current, { id: current.length, from: 'farmer', text: question }]);

    let reply: Pick<Message, 'text' | 'sources'>;
    try {
      const answer = await askAssistant(question, language ?? 'en', crops);
      reply = { text: answer.answer, sources: answer.sources };
    } catch (error) {
      const isSignedOut = error instanceof ApiError && error.code === 'signed_out';
      reply = { text: isSignedOut ? strings.auth.signInSubtitle : strings.assistant.unavailable };
    }
    setMessages((current) => [...current, { id: current.length, from: 'assistant', ...reply }]);
    setIsWaiting(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={strings.home.assistant} />
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.messages}
          // Keep the newest message in view.
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          <Text style={styles.intro}>{strings.assistant.intro}</Text>
          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.from === 'farmer' ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, message.from === 'farmer' && styles.mineText]}>{message.text}</Text>
              {message.sources && message.sources.length > 0 && (
                <View style={styles.sources}>
                  <Text style={styles.sourcesTitle}>{strings.diagnoses.sources}</Text>
                  <SourceLinks sources={message.sources} />
                </View>
              )}
            </View>
          ))}
          {isWaiting && <ActivityIndicator color={colors.primary} style={styles.waiting} />}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={strings.assistant.placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.assistant.send}
            disabled={!canSend}
            onPress={send}
            style={[styles.send, !canSend && styles.sendDisabled]}
          >
            <MaterialCommunityIcons name="send" size={22} color={canSend ? colors.onPrimary : colors.onDisabled} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  messages: {
    gap: 10,
    padding: 16,
  },
  intro: {
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  theirs: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  mineText: {
    color: colors.onPrimary,
  },
  sources: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourcesTitle: {
    marginBottom: 2,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  waiting: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: {
    backgroundColor: colors.disabled,
  },
});
