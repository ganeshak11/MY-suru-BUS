import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BusAPI } from '../lib/apiClient';
import { useTheme } from '../contexts/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import { Header } from '../components/Header';

const ReportPage: React.FC = () => {
  const router = useRouter();
  const { colors: currentColors } = useTheme();

  const [reportType, setReportType] = useState('Driver Behavior');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  useEffect(() => {
    fetchActiveTrips();
  }, []);

  const fetchActiveTrips = async () => {
    try {
      // Buses running right now; the server picks the driver from the trip.
      setTrips((await BusAPI.getActiveTrips()) || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please provide a message for your report.');
      return;
    }

    if (!selectedTripId) {
      Alert.alert('Error', 'Please select a bus and route.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedTrip = trips.find(t => t.trip_id.toString() === selectedTripId);
      
      await BusAPI.createReport({
        report_type: reportType,
        message: message,
        trip_id: selectedTrip.trip_id,
        bus_id: selectedTrip.bus_id,
        route_id: selectedTrip.route_id,
      });

      Alert.alert('Success', 'Your report has been submitted. Thank you for your feedback.');
      router.back();
    } catch (error) {
      console.error('Exception submitting report:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={currentColors.primaryAccent} />
      </View>
    );
  }

  return (
    // Keep the message box and Submit button above the keyboard.
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Header showBackButton />
      <Text style={styles.header}>Submit a Report</Text>

      <Text style={styles.label}>Select Bus & Route</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedTripId}
          onValueChange={(itemValue) => setSelectedTripId(itemValue)}
          style={styles.picker}
          dropdownIconColor={currentColors.primaryText}
        >
          <Picker.Item label="-- Select Bus & Route --" value="" />
          {trips.map((trip) => (
            <Picker.Item
              key={trip.trip_id}
              label={`Bus ${trip.bus_no} - ${trip.route_name}`}
              value={trip.trip_id.toString()}
            />
          ))}
        </Picker>
      </View>
      {trips.length === 0 && (
        <Text style={{ color: currentColors.secondaryText, marginTop: -8, marginBottom: 16 }}>
          No buses are running right now, so there is nothing to report against. Please try again during service hours.
        </Text>
      )}

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
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ReportPage;
