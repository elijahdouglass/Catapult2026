import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  compact?: boolean;
}

export function VerifiedBadge({ compact }: Props) {
  if (compact) {
    return <Ionicons name="checkmark-circle" size={14} color="#22c55e" style={{ marginLeft: 4 }} />;
  }

  return (
    <View style={styles.row}>
      <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
      <Text style={styles.text}>Verified Human</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
});
