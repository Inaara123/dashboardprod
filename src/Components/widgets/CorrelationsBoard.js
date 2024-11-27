import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HeatMapGrid } from 'react-grid-heatmap';
import Switch from 'react-switch';
import PropTypes from 'prop-types';
import { supabase } from '../../supabaseClient';

const WidgetContainer = styled.div`
  background-color: #131517;
  padding: 20px;
  border-radius: 15px;
  color: #fff;
  width: 80%;
  margin-left: 75px;
  height: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const YLabelContainer = styled.div`
  display: flex;
  align-items: center;
  padding-right: 10px;
  justify-content: flex-end;
  width: 100px;
`;

const WidgetTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
`;

const HeatmapContainer = styled.div`
  width: 100%;
  height: auto;
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  padding: 20px;
  text-align: center;
  background-color: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  margin: 10px 0;
`;

const BreakdownContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background-color: #2a2a2a;
  border-radius: 10px;
`;

const GenderSection = styled.div`
  margin-bottom: 20px;
`;

const GenderTitle = styled.h4`
  color: #fff;
  margin-bottom: 10px;
  font-size: 16px;
`;

const BreakdownItem = styled.div`
  color: #e0e0e0;
  margin: 8px 0;
  font-size: 14px;
  display: flex;
  align-items: center;
`;

const PercentageBar = styled.div`
  height: 8px;
  background-color: rgba(0, 128, 255, 0.3);
  border-radius: 4px;
  margin-left: 10px;
  flex: 1;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.percentage}%;
    background-color: #0080ff;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;

const CorrelationsBoard = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [data, setData] = useState({
    male: { total: 0, channels: {} },
    female: { total: 0, channels: {} }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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
const getTimeRanges = () => {
  const now = new Date();
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
      if (startDate && endDate) {
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        const duration = currentEnd - currentStart;
        previousStart = new Date(currentStart - duration);
        previousEnd = currentStart;
      }
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

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { currentStart, currentEnd, previousStart, previousEnd } = getTimeRanges();

      // Fetch current period data
      let currentQuery = supabase
        .from('appointments')
        .select(`
          patient_id,
          appointment_time,
          patients!inner(
            gender,
            how_did_you_get_to_know_us
          )
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(currentStart))
        .lte('appointment_time', formatDate(currentEnd));

      // Fetch previous period data
      let previousQuery = supabase
        .from('appointments')
        .select(`
          patient_id,
          appointment_time,
          patients!inner(
            gender,
            how_did_you_get_to_know_us
          )
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(previousStart))
        .lte('appointment_time', formatDate(previousEnd));

      if (doctorId !== 'all') {
        currentQuery = currentQuery.eq('doctor_id', doctorId);
        previousQuery = previousQuery.eq('doctor_id', doctorId);
      }

      const [currentResponse, previousResponse] = await Promise.all([
        currentQuery,
        previousQuery
      ]);

      if (currentResponse.error) throw currentResponse.error;
      if (previousResponse.error) throw previousResponse.error;

      // Process current period data
      const currentData = {
        male: { total: 0, channels: {} },
        female: { total: 0, channels: {} }
      };

      currentResponse.data.forEach(appointment => {
        const gender = appointment.patients.gender.toLowerCase();
        const channel = appointment.patients.how_did_you_get_to_know_us;

        if (gender in currentData) {
          currentData[gender].total++;
          currentData[gender].channels[channel] = (currentData[gender].channels[channel] || 0) + 1;
        }
      });

      setData(currentData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
    fetchData();
  }
}, [hospitalId, doctorId, timeRange, startDate, endDate]);


  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Discovery Channel Distribution</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Discovery Channel Distribution</WidgetTitle>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  const channels = [...new Set(
    [...Object.keys(data.male.channels), ...Object.keys(data.female.channels)]
  )].sort();

  const maxValue = Math.max(
    ...Object.values(data.male.channels),
    ...Object.values(data.female.channels),
    1
  );

  const formattedData = ['male', 'female'].map(gender =>
    channels.map(channel => {
      const count = data[gender].channels[channel] || 0;
      const total = data[gender].total || 1;
      return showPercentage ? ((count / total) * 100).toFixed(1) : count;
    })
  );

  const renderBreakdown = (gender) => {
    const genderData = data[gender.toLowerCase()];
    if (!genderData || !genderData.total) return null;

    return Object.entries(genderData.channels)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, count]) => {
        const percentage = ((count / genderData.total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${gender}-${channel}`}>
            {percentage}% of {gender}s discovered through {channel}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Discovery Channel Distribution
        <Switch
          onChange={() => setShowPercentage(!showPercentage)}
          checked={showPercentage}
          offColor="#888"
          onColor="#66ff66"
          uncheckedIcon={false}
          checkedIcon={false}
        />
      </WidgetTitle>
      <HeatmapContainer>
        <HeatMapGrid
          data={formattedData}
          xLabels={channels}
          yLabels={['Male', 'Female']}
          cellRender={(x, y, value) => (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {value}{showPercentage ? '%' : ''}
            </div>
          )}
          xLabelsStyle={() => ({
            color: '#ffffff',
            fontSize: '1rem',
          })}
          yLabelsStyle={() => ({
            fontSize: '1rem',
            color: '#ffffff',
            marginRight: '15px',
          })}
// In the return statement, modify the HeatMapGrid component's cellStyle prop:

cellStyle={(x, y) => {
  try {
    const genderIndex = ['male', 'female'][x];
    const currentChannel = channels[y];
    
    // Safely access the data
    const rawValue = data[genderIndex]?.channels[currentChannel] || 0;
    const alpha = maxValue > 0 ? rawValue / maxValue : 0;
    
    return {
      background: `rgba(0, 128, 255, ${Math.min(Math.max(alpha, 0.1), 1)})`,
      fontSize: '0.9rem',
      color: 'white',
      border: '1px solid #ffffff',
      transition: 'all 0.3s ease'
    };
  } catch (error) {
    // Fallback style if there's any error
    return {
      background: `rgba(0, 128, 255, 0.1)`,
      fontSize: '0.9rem',
      color: 'white',
      border: '1px solid #ffffff',
      transition: 'all 0.3s ease'
    };
  }
}}
          cellHeight="5.5rem"
          xLabelsPos="top"
          yLabelsPos="left"
          yLabelsRender={(label) => (
            <YLabelContainer>
              {label}
            </YLabelContainer>
          )}
          square
        />
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <span style={{ color: '#a5a5a5' }}>
            {showPercentage ? 'Showing Percentages' : 'Showing Actual Values'}
          </span>
        </div>
      </HeatmapContainer>


    </WidgetContainer>
  );
};

CorrelationsBoard.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default CorrelationsBoard;