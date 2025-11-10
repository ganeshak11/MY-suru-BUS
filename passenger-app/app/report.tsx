import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import { Picker } from '@react-native-picker/picker';

const ReportPage: React.FC = () => {
  const router = useRouter();
  const { colors: currentColors } = useTheme();

  const [reportType, setReportType] = useState('Driver Behavior');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please provide a message for your report.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('passenger_reports').insert([
      {
        report_type: reportType,
        message: message,
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Could not submit your report. Please try again later.');
    } else {
      Alert.alert('Success', 'Your report has been submitted. Thank you for your feedback.');
      router.back();
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: currentColors.mainBackground, padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', color: currentColors.primaryText, marginBottom: 20 },
    label: { fontSize: 16, color: currentColors.secondaryText, marginBottom: 10, marginTop: 15 },
    input: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 10,
      padding: 15,
      color: currentColors.primaryText,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: currentColors.cardBackground,
        borderRadius: 10,
        overflow: 'hidden',
    },
    picker: {
        color: currentColors.primaryText,
    },
    button: {
      backgroundColor: currentColors.primaryAccent,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
      marginTop: 30,
    },
    buttonText: { color: currentColors.buttonText, fontWeight: 'bold' },
    cancelButton: {
        marginTop: 15,
        alignItems: 'center',
    },
    cancelText: {
        color: currentColors.secondaryText,
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Submit a Report</Text>

      <Text style={styles.label}>Report Category</Text>
      <View style={styles.pickerContainer}>
        <Picker
            selectedValue={reportType}
            onValueChange={(itemValue) => setReportType(itemValue)}
            style={styles.picker}
            dropdownIconColor={currentColors.primaryText}
        >
            <Picker.Item label="Driver Behavior" value="Driver Behavior" />
            <Picker.Item label="Bus Condition" value="Bus Condition" />
            <Picker.Item label="Scheduling Issue" value="Scheduling Issue" />
            <Picker.Item label="App Bug / Suggestion" value="App Bug / Suggestion" />
            <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>

      <Text style={styles.label}>Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Please provide as much detail as possible..."
        placeholderTextColor={currentColors.secondaryText}
        multiline
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ReportPage;
