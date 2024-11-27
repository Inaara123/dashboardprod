import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const OldVsNewWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [data, setData] = useState({ new: 0, oldFollowup: 0, oldFresh: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current date range
        let currentEnd = new Date();
        let currentStart = new Date();
        let previousStart = new Date();
        let previousEnd;

        switch (timeRange) {
          case '1day':
            currentStart.setHours(0, 0, 0, 0);
            previousStart.setDate(previousStart.getDate() - 1);
            previousStart.setHours(0, 0, 0, 0);
            previousEnd = new Date(currentStart);
            break;
          case '1week':
            currentStart.setDate(currentStart.getDate() - 7);
            previousStart.setDate(previousStart.getDate() - 14);
            previousEnd = currentStart;
            break;
          case '1month':
            currentStart.setMonth(currentStart.getMonth() - 1);
            previousStart.setMonth(previousStart.getMonth() - 2);
            previousEnd = currentStart;
            break;
          case '3months':
            currentStart.setMonth(currentStart.getMonth() - 3);
            previousStart.setMonth(previousStart.getMonth() - 6);
            previousEnd = currentStart;
            break;
          case 'custom':
            if (startDate && endDate) {
              currentStart = new Date(startDate);
              currentEnd = new Date(endDate);
              const duration = currentEnd - currentStart;
              previousStart = new Date(currentStart - duration);
              previousEnd = currentStart;
            }
            break;
          default:
            currentStart.setHours(0, 0, 0, 0);
            previousStart.setDate(previousStart.getDate() - 1);
            previousStart.setHours(0, 0, 0, 0);
            previousEnd = new Date(currentStart);
        }

        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
          
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
        };

        // Get patients from previous period only
        let previousQuery = supabase
          .from('appointments')
          .select('patient_id')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(previousStart))
          .lt('appointment_time', formatDate(previousEnd));

        if (doctorId !== 'all') {
          previousQuery = previousQuery.eq('doctor_id', doctorId);
        }

        const { data: previousPatients, error: previousError } = await previousQuery;
        if (previousError) throw previousError;

        const patientsWithHistory = new Set(previousPatients.map(app => app.patient_id));

        // Get current period appointments
        let currentQuery = supabase
          .from('appointments')
          .select('patient_id, appointment_time, is_follow_up')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(currentStart))
          .lte('appointment_time', formatDate(currentEnd))
          .order('appointment_time', { ascending: true });

        if (doctorId !== 'all') {
          currentQuery = currentQuery.eq('doctor_id', doctorId);
        }

        const { data: currentAppointments, error: currentError } = await currentQuery;
        if (currentError) throw currentError;

        const becameOldDuringRange = new Set();
        let newCount = 0;
        let oldFollowupCount = 0;
        let oldFreshCount = 0;

        currentAppointments.forEach(appointment => {
          const { patient_id, is_follow_up } = appointment;

          if (patientsWithHistory.has(patient_id) || becameOldDuringRange.has(patient_id)) {
            if (is_follow_up) {
              oldFollowupCount++;
            } else {
              oldFreshCount++;
            }
          } else {
            newCount++;
            becameOldDuringRange.add(patient_id);
          }
        });

        setData({
          new: newCount,
          oldFollowup: oldFollowupCount,
          oldFresh: oldFreshCount
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) return <div style={styles.loading}>Loading...</div>;

  if (error) return <div style={styles.error}>{error}</div>;

  const total = data.new + data.oldFollowup + data.oldFresh;

  return (
    <div style={styles.container}>
      <div style={styles.line}>
        New Patients - {data.new} ({((data.new/total)*100).toFixed(1)}%)
      </div>
      <div style={styles.line}>
        Old Patients Fresh Consultation - {data.oldFresh} ({((data.oldFresh/total)*100).toFixed(1)}%)
      </div>
      <div style={styles.line}>
        Old Patients FollowUp - {data.oldFollowup} ({((data.oldFollowup/total)*100).toFixed(1)}%)
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '15px',
    backgroundColor: '#1E2023',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  line: {
    padding: '8px 0',
    fontSize: '14px',
    color: '#F0F2F5',
  },
  loading: {
    padding: '15px',
    textAlign: 'center',
    color: '#666',
  },
  error: {
    padding: '15px',
    textAlign: 'center',
    color: '#f44336',
  }
};

export default OldVsNewWidget;
