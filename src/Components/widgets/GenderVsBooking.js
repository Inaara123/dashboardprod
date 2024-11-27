import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HeatMapGrid } from 'react-grid-heatmap';
import Switch from 'react-switch';
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

const WidgetTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeatmapContainer = styled.div`
  width: 100%;
  height: auto;
`;

const YLabelContainer = styled.div`
  display: flex;
  align-items: center;
  padding-right: 10px;
  justify-content: flex-end;
  width: 100px;
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

const GenderVsBooking = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [data, setData] = useState({
    male: { total: 0, types: {} },
    female: { total: 0, types: {} }
  });
  const [showPercentage, setShowPercentage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingTypes, setBookingTypes] = useState([]);

  useEffect(() => {
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
          currentStart = new Date(today);
          currentStart.setDate(currentStart.getDate() - 7);
          currentEnd = now;
          break;
        case '1month':
          currentStart = new Date(today);
          currentStart.setMonth(currentStart.getMonth() - 1);
          currentEnd = now;
          break;
        case '3months':
          currentStart = new Date(today);
          currentStart.setMonth(currentStart.getMonth() - 3);
          currentEnd = now;
          break;
        case 'custom':
          if (startDate && endDate) {
            currentStart = new Date(startDate);
            currentEnd = new Date(endDate);
          }
          break;
        default:
          currentStart = today;
          currentEnd = now;
      }
      
      return { currentStart, currentEnd };
    };

    const formatDate = (date) => {
      return date.toISOString();
    };

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { currentStart, currentEnd } = getTimeRanges();

        // First, get all distinct appointment types for the given time range
        let typesQuery = supabase
          .from('appointments')
          .select('appointment_type')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(currentStart))
          .lte('appointment_time', formatDate(currentEnd))
          .not('appointment_type', 'is', null);

        if (doctorId !== 'all') {
          typesQuery = typesQuery.eq('doctor_id', doctorId);
        }

        const { data: typesData } = await typesQuery;
        const uniqueTypes = [...new Set(typesData.map(item => item.appointment_type))].sort();
        setBookingTypes(uniqueTypes);

        // Then get the main data
        let query = supabase
          .from('appointments')
          .select(`
            appointment_type,
            patients!inner(
              gender
            )
          `)
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(currentStart))
          .lte('appointment_time', formatDate(currentEnd));

        if (doctorId !== 'all') {
          query = query.eq('doctor_id', doctorId);
        }

        const { data: appointments, error } = await query;
        if (error) throw error;

        const newData = {
          male: { total: 0, types: {} },
          female: { total: 0, types: {} }
        };

        // Initialize all types with 0
        uniqueTypes.forEach(type => {
          newData.male.types[type] = 0;
          newData.female.types[type] = 0;
        });

        // Process appointments
        appointments.forEach(appointment => {
          const gender = appointment.patients.gender.toLowerCase();
          const appointmentType = appointment.appointment_type;

          if (gender in newData && appointmentType) {
            newData[gender].total++;
            newData[gender].types[appointmentType]++;
          }
        });

        setData(newData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchData();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading || bookingTypes.length === 0) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Booking Type</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  const formattedData = ['male', 'female'].map(gender => {
    return bookingTypes.map(type => {
      const count = data[gender].types[type] || 0;
      return showPercentage 
        ? ((count / (data[gender].total || 1)) * 100).toFixed(1)
        : count;
    });
  });

  return (
    <WidgetContainer>
      <WidgetTitle>
        Gender vs Booking Type
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
          xLabels={bookingTypes}
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
          cellStyle={(x, y) => {
            const gender = ['male', 'female'][y];
            const type = bookingTypes[x];
            const value = data[gender].types[type] || 0;
            const total = data[gender].total || 1;
            const percentage = value / total;
            return {
              background: `rgba(0, 128, 255, ${Math.min(Math.max(percentage, 0.1), 1)})`,
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
            <YLabelContainer>{label}</YLabelContainer>
          )}
          square
        />
      </HeatmapContainer>

      <BreakdownContainer>
        {['Male', 'Female'].map(gender => {
          const genderData = data[gender.toLowerCase()];
          if (!genderData.total) return null;

          return (
            <GenderSection key={gender}>
              <GenderTitle>{gender} Breakdown (Total: {genderData.total})</GenderTitle>
              {bookingTypes.map(type => {
                const count = genderData.types[type] || 0;
                const percentage = ((count / genderData.total) * 100).toFixed(1);
                return (
                  <BreakdownItem key={`${gender}-${type}`}>
                    {percentage}% of {gender}s came through {type} ({count} patients)
                    <PercentageBar percentage={percentage} />
                  </BreakdownItem>
                );
              })}
            </GenderSection>
          );
        })}
      </BreakdownContainer>
    </WidgetContainer>
  );
};

export default GenderVsBooking;