import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HeatMapGrid } from 'react-grid-heatmap';
import Switch from 'react-switch';
import PropTypes from 'prop-types';
import { supabase } from '../../supabaseClient';

const WidgetContainer = styled.div`

  border-radius: 15px;
  color: #fff;
  width: 80%;
  margin-left: -50px;
  padding : 10px;
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

const GenderVsDay = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [data, setData] = useState({
    male: { total: 0, days: {} },
    female: { total: 0, days: {} }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getTimeRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let currentStart, currentEnd;

    switch (timeRange) {
      case '1day':
        currentStart = today;
        currentEnd = now;
        break;
      case '1week':
        currentStart = new Date(today.setDate(today.getDate() - 7));
        currentEnd = now;
        break;
      case '1month':
        currentStart = new Date(today.setMonth(today.getMonth() - 1));
        currentEnd = now;
        break;
      case '3months':
        currentStart = new Date(today.setMonth(today.getMonth() - 3));
        currentEnd = now;
        break;
      case 'custom':
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        break;
      default:
        currentStart = today;
        currentEnd = now;
    }

    return { currentStart, currentEnd };
  };

  const formatDate = (date) => {
    return date.toISOString().slice(0, 23).replace('T', ' ');
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const { currentStart, currentEnd } = getTimeRanges();
      let query = supabase
        .from('appointments')
        .select(`
          appointment_time,
          patients!inner(gender)
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(currentStart))
        .lte('appointment_time', formatDate(currentEnd));

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data: appointments, error: queryError } = await query;
      
      if (queryError) {
        setError(queryError.message);
        setIsLoading(false);
        return;
      }

      const result = {
        male: { total: 0, days: {} },
        female: { total: 0, days: {} }
      };

      // Initialize all days to 0
      weekdays.forEach(day => {
        result.male.days[day] = 0;
        result.female.days[day] = 0;
      });

      appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.appointment_time);
        const dayOfWeek = weekdays[appointmentDate.getDay()];
        const gender = appointment.patients.gender.toLowerCase();

        if (gender in result) {
          result[gender].total++;
          result[gender].days[dayOfWeek]++;
        }
      });

      setData(result);
      setIsLoading(false);
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Weekday Distribution</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Weekday Distribution</WidgetTitle>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  const maxValue = Math.max(
    ...Object.values(data.male.days),
    ...Object.values(data.female.days),
    1
  );

  const formattedData = ['male', 'female'].map(gender =>
    weekdays.map(day => {
      const count = data[gender].days[day] || 0;
      const total = data[gender].total || 1;
      return showPercentage ? ((count / total) * 100).toFixed(1) : count;
    })
  );

  const renderBreakdown = (gender) => {
    const genderData = data[gender.toLowerCase()];
    if (!genderData || !genderData.total) return null;

    return Object.entries(genderData.days)
      .sort(([, a], [, b]) => b - a)
      .map(([day, count]) => {
        const percentage = ((count / genderData.total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${gender}-${day}`}>
            {percentage}% of {gender}s visited on {day}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Weekday Distribution
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
          xLabels={weekdays}
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
          cellStyle={(x, y, value) => {
            const gender = ['male', 'female'][x];
            const currentDay = weekdays[y];
            const rawValue = data[gender]?.days[currentDay] || 0;
            const alpha = maxValue > 0 ? rawValue / maxValue : 0;
            
            return {
              background: `rgba(0, 128, 255, ${Math.min(Math.max(alpha, 0.1), 1)})`,
              fontSize: '0.9rem',
              color: 'white',
              border: '1px solid #ffffff',
              transition: 'all 0.3s ease'
            };
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
      {/* <BreakdownContainer>
        <GenderSection>
          <GenderTitle>Male Distribution</GenderTitle>
          {renderBreakdown('male')}
        </GenderSection>
        <GenderSection>
          <GenderTitle>Female Distribution</GenderTitle>
          {renderBreakdown('female')}
        </GenderSection>
      </BreakdownContainer> */}
    </WidgetContainer>
  );
};

GenderVsDay.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default GenderVsDay;