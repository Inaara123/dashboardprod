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

const LocationVsDiscovery = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [data, setData] = useState({});
  const [topLocations, setTopLocations] = useState([]);
  const [discoveryChannels, setDiscoveryChannels] = useState([]);
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

  const getLocationFromAddress = (address) => {
    if (!address) return 'Unknown';
    return address.split(',')[0].trim();
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
              address,
              how_did_you_get_to_know_us
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

        // Get top 5 locations
        const locationCounts = {};
        const channelSet = new Set();
        
        appointments.forEach(appointment => {
          const location = getLocationFromAddress(appointment.patients.address);
          locationCounts[location] = (locationCounts[location] || 0) + 1;
          
          const channel = appointment.patients.how_did_you_get_to_know_us;
          if (channel) channelSet.add(channel);
        });

        const top5Locations = Object.entries(locationCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([location]) => location);

        const allChannels = Array.from(channelSet).sort();

        setTopLocations(top5Locations);
        setDiscoveryChannels(allChannels);

        // Process location vs discovery channel data
        const result = {};
        appointments.forEach(appointment => {
          const location = getLocationFromAddress(appointment.patients.address);
          if (!top5Locations.includes(location)) return;
          
          const channel = appointment.patients.how_did_you_get_to_know_us;
          if (!channel) return;

          if (!result[location]) {
            result[location] = { total: 0, channels: {} };
          }
          result[location].total++;
          result[location].channels[channel] = (result[location].channels[channel] || 0) + 1;
        });

        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Location vs Discovery Channel Distribution</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Location vs Discovery Channel Distribution</WidgetTitle>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  const maxValue = Math.max(
    ...Object.values(data).flatMap(locationGroup => 
      Object.values(locationGroup.channels)
    ),
    1
  );

  const formattedData = topLocations.map(location => 
    discoveryChannels.map(channel => {
      const count = data[location]?.channels[channel] || 0;
      const total = data[location]?.total || 1;
      return showPercentage ? ((count / total) * 100).toFixed(1) : count;
    })
  );

  const renderBreakdown = (location) => {
    const locationData = data[location];
    if (!locationData || !locationData.total) return null;

    return Object.entries(locationData.channels)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, count]) => {
        const percentage = ((count / locationData.total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${location}-${channel}`}>
            {percentage}% of patients from {location} discovered through {channel}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Location vs Discovery Channel Distribution
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
          xLabels={discoveryChannels}
          yLabels={topLocations}
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
              const location = topLocations[x];
              const channel = discoveryChannels[y];
              
              const rawValue = data[location]?.channels[channel] || 0;
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
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <span style={{ color: '#a5a5a5' }}>
            {showPercentage ? 'Showing Percentages' : 'Showing Actual Values'}
          </span>
        </div>
      </HeatmapContainer>
      {/* <BreakdownContainer>
        {topLocations.map(location => renderBreakdown(location))}
      </BreakdownContainer> */}
    </WidgetContainer>
  );
};

LocationVsDiscovery.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default LocationVsDiscovery;