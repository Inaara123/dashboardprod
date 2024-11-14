import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HeatMapGrid } from 'react-grid-heatmap';
import Switch from 'react-switch';
import PropTypes from 'prop-types';
import { supabase } from '../../supabaseClient';

const WidgetContainer = styled.div`
  background-color: #131517;
  padding: -60px;
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

const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PopupContent = styled.div`
  background-color: #1e1e1e;
  padding: 30px;
  border-radius: 15px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
  &:hover {
    color: #ff6b6b;
  }
`;

const ShowAllLink = styled.button`
  background: none;
  border: none;
  color: #0080ff;
  text-decoration: underline;
  cursor: pointer;
  display: block;
  margin: 10px auto;
  font-size: 14px;
  padding: 5px;
  &:hover {
    color: #66b2ff;
  }
`;

const PopupTitle = styled.h2`
  color: #fff;
  margin-bottom: 20px;
  padding-right: 40px;
`;

const GenderVsLocation = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [data, setData] = useState({
    male: { total: 0, locations: {} },
    female: { total: 0, locations: {} }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const extractLocation = (address) => {
    if (!address) return 'Unknown';
    const parts = address.split(',');
    return parts[0].trim();  // Changed to return first part instead of second
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { currentStart, currentEnd } = getTimeRanges();
        let query = supabase
          .from('appointments')
          .select(`
            patient_id,
            appointment_time,
            patients!inner(
              gender,
              address
            )
          `)
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(currentStart))
          .lte('appointment_time', formatDate(currentEnd));

        if (doctorId !== 'all') {
          query = query.eq('doctor_id', doctorId);
        }

        const { data: appointments, error: queryError } = await query;
        if (queryError) throw queryError;

        const result = {
          male: { total: 0, locations: {} },
          female: { total: 0, locations: {} }
        };

        appointments.forEach(appointment => {
          const gender = appointment.patients.gender.toLowerCase();
          const location = extractLocation(appointment.patients.address);

          if (gender in result) {
            result[gender].total++;
            result[gender].locations[location] = (result[gender].locations[location] || 0) + 1;
          }
        });

        setData(result);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Location Distribution</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Location Distribution</WidgetTitle>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  const allLocations = [...new Set(
    [...Object.keys(data.male.locations), ...Object.keys(data.female.locations)]
  )].sort((a, b) => {
    const totalA = (data.male.locations[a] || 0) + (data.female.locations[a] || 0);
    const totalB = (data.male.locations[b] || 0) + (data.female.locations[b] || 0);
    return totalB - totalA;
  });

  const top5Locations = allLocations.slice(0, 5);

  const maxValue = Math.max(
    ...Object.values(data.male.locations),
    ...Object.values(data.female.locations),
    1
  );

  const getFormattedData = (locations) => ['male', 'female'].map(gender =>
    locations.map(location => {
      const count = data[gender].locations[location] || 0;
      const total = data[gender].total || 1;
      return showPercentage ? ((count / total) * 100).toFixed(1) : count;
    })
  );

  const renderHeatmap = (locations) => (
    <HeatMapGrid
      data={getFormattedData(locations)}
      xLabels={locations}
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
        try {
          const genderIndex = ['male', 'female'][x];
          const location = locations[y];
          const rawValue = data[genderIndex]?.locations[location] || 0;
          const alpha = maxValue > 0 ? rawValue / maxValue : 0;
          
          return {
            background: `rgba(0, 128, 255, ${Math.min(Math.max(alpha, 0.1), 1)})`,
            fontSize: '0.9rem',
            color: 'white',
            border: '1px solid #ffffff',
            transition: 'all 0.3s ease'
          };
        } catch (error) {
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
  );

  const renderBreakdown = (gender) => {
    const genderData = data[gender.toLowerCase()];
    if (!genderData || !genderData.total) return null;

    return Object.entries(genderData.locations)
      .sort(([, a], [, b]) => b - a)
      .map(([location, count]) => {
        const percentage = ((count / genderData.total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${gender}-${location}`}>
            {location}: {count} ({percentage}% of {gender}s)
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Gender vs Location Distribution
        <Switch
          onChange={() => setShowPercentage(!showPercentage)}
          checked={showPercentage}
          offColor="#888"
          onColor="#66ff66"
          uncheckedIcon={false}
          checkedIcon={false}
        />
      </WidgetTitle>
      
      {!showAllLocations && (
        <HeatmapContainer>
          {renderHeatmap(top5Locations)}
          <ShowAllLink onClick={() => setShowAllLocations(true)}>
            Show detailed breakdown ({allLocations.length} locations)
          </ShowAllLink>
        </HeatmapContainer>
      )}

      {showAllLocations && (
        <PopupOverlay>
          <PopupContent>
            <PopupTitle>Complete Location Distribution</PopupTitle>
            <CloseButton onClick={() => setShowAllLocations(false)}>×</CloseButton>
            <BreakdownContainer>
              <GenderSection>
                <GenderTitle>Male Distribution (All Locations)</GenderTitle>
                {renderBreakdown('Male')}
              </GenderSection>
              
              <GenderSection>
                <GenderTitle>Female Distribution (All Locations)</GenderTitle>
                {renderBreakdown('Female')}
              </GenderSection>
            </BreakdownContainer>
          </PopupContent>
        </PopupOverlay>
      )}
    </WidgetContainer>
  );
};

GenderVsLocation.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default GenderVsLocation;