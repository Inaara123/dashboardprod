// src/components/widgets/VisitsWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const VisitsWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [visitsCount, setVisitsCount] = useState(0);
  const [comparison, setComparison] = useState({ percentage: 0, increased: false });
  const [loading, setLoading] = useState(true);

  const getTimeRanges = () => {
    const now = new Date()

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let currentStart, currentEnd, previousStart, previousEnd;
    
    switch (timeRange) {
      case '1day':
        currentStart = today;
        currentEnd = now;
        previousStart = new Date(today);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = today;
        break;
      case '1week':
        currentStart = new Date(today);
        currentStart.setDate(currentStart.getDate() - 7);
        currentEnd = now;
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = currentStart;
        break;
      case '1month':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 1);
        currentEnd = now;
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 1);
        previousEnd = currentStart;
        break;
      case '3months':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 3);
        currentEnd = now;
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 3);
        previousEnd = currentStart;
        break;
      case 'custom':
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        const duration = currentEnd - currentStart;
        previousStart = new Date(currentStart - duration);
        previousEnd = currentStart;
        break;
      default:
        currentStart = today;
        currentEnd = now;
        previousStart = new Date(today);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = today;
    }
    
    return { currentStart, currentEnd, previousStart, previousEnd };
  };
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

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd, previousStart, previousEnd } = getTimeRanges();


      let query = supabase
        .from('appointments')
        .select('appointment_id', { count: 'exact' })
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(currentStart))
        .lte('appointment_time', formatDate(currentEnd));

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { count: currentCount, error: currentError } = await query;

      if (currentError) throw currentError;

      let previousQuery = supabase
        .from('appointments')
        .select('appointment_id', { count: 'exact' })
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(previousStart))
        .lte('appointment_time', formatDate(previousEnd));

      if (doctorId !== 'all') {
        previousQuery = previousQuery.eq('doctor_id', doctorId);
      }

      const { count: previousCount, error: previousError } = await previousQuery;

      if (previousError) throw previousError;

      setVisitsCount(currentCount || 0);

      if (previousCount > 0) {
        const percentageChange = ((currentCount - previousCount) / previousCount) * 100;
        setComparison({
          percentage: Math.abs(Math.round(percentageChange)),
          increased: percentageChange > 0
        });
      } else {
        setComparison(null);
      }

    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchVisits();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  const getComparisonText = () => {
    if (!comparison) return '';
    const timeFrameText = {
      '1day': 'yesterday',
      '1week': 'last week',
      '1month': 'last month',
      '3months': 'last 3 months',
      'custom': 'previous period'
    }[timeRange];
    return `${comparison.percentage}% ${comparison.increased ? 'up' : 'down'} from ${timeFrameText}`;
  };

  return (
    <div style={{
      backgroundColor: '#1E2023', // Match parent background
      width: '100%', // Take full width of parent
      height: '100%', // Take full height of parent
      padding: '0', // Remove padding since parent already has it
      margin: '0', // Remove any margin
      border: 'none', // Remove border
      borderRadius: '0', // Remove border radius
      boxShadow: 'none', // Remove shadow
      display: 'flex',
      flexDirection: 'column',
      color: '#e0e0e0'
    }}>
      <h3 style={{ 
        margin: '0 0 15px 0', 
        color: '#F0F2F5',
        fontSize: '20px',
        fontWeight: '600'
      }}>
        Number of Patients
      </h3>
      {loading ? (
        <div style={{ color: '#bdbdbd' }}>Loading...</div>
      ) : (
        <>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            color: '#ffffff'
          }}>
            {visitsCount}
          </div>
          {comparison && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: comparison.increased ? '#4caf50' : '#f44336',
              fontSize: '14px',
              padding: '5px 0'
            }}>
              {comparison.increased ? <FaArrowUp /> : <FaArrowDown />}
              <span style={{ marginLeft: '5px' }}>{getComparisonText()}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisitsWidget;