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

const AgeVsDiscovery = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [data, setData] = useState({});
  const [ageSettings, setAgeSettings] = useState([]);
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

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getAgeBin = (age) => {
    for (const bin of ageSettings) {
      if (age >= parseInt(bin.start) && age < parseInt(bin.end)) {
        return `${bin.start}-${bin.end}`;
      }
    }
    return null;
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
        // First, fetch the age settings
        const { data: hospitalData, error: hospitalError } = await supabase
          .from('hospitals')
          .select('age_settings')
          .eq('hospital_id', hospitalId)
          .single();

        if (hospitalError) throw hospitalError;
        setAgeSettings(hospitalData.age_settings);

        const { currentStart, currentEnd } = getTimeRanges();
        
        // Then fetch the appointments data
        let query = supabase
          .from('appointments')
          .select(`
            patient_id,
            appointment_time,
            patients!inner(
              how_did_you_get_to_know_us,
              date_of_birth
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
        console.log("the data in Age vs Discovery is : ",data)
        const result = {};
        const channels = new Set();

        appointments.forEach(appointment => {
          const channel = appointment.patients.how_did_you_get_to_know_us;
          if (channel) channels.add(channel);
          
          const age = calculateAge(appointment.patients.date_of_birth);
          const ageBin = getAgeBin(age);

          if (channel && ageBin) {
            if (!result[ageBin]) {
              result[ageBin] = { total: 0, channels: {} };
            }
            result[ageBin].total++;
            result[ageBin].channels[channel] = (result[ageBin].channels[channel] || 0) + 1;
          }
        });

        setDiscoveryChannels(Array.from(channels).sort());
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
        <WidgetTitle>Age vs Discovery Channel Distribution</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Age vs Discovery Channel Distribution</WidgetTitle>
        <ErrorMessage>Error: {error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  const ageBins = ageSettings.map(bin => `${bin.start}-${bin.end}`);
  
  const maxValue = Math.max(
    ...Object.values(data).flatMap(ageGroup => 
      Object.values(ageGroup.channels)
    ),
    1
  );

  const formattedData = ageBins.map(ageBin => 
    discoveryChannels.map(channel => {
      const count = data[ageBin]?.channels[channel] || 0;
      const total = data[ageBin]?.total || 1;
      return showPercentage ? ((count / total) * 100).toFixed(1) : count;
    })
  );

  const renderBreakdown = (ageBin) => {
    const ageBinData = data[ageBin];
    if (!ageBinData || !ageBinData.total) return null;

    return Object.entries(ageBinData.channels)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, count]) => {
        const percentage = ((count / ageBinData.total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${ageBin}-${channel}`}>
            {percentage}% of age group {ageBin} came through {channel}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Age vs Discovery Channel Distribution
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
          yLabels={ageBins}
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
              const ageBin = ageBins[x];
              const channel = discoveryChannels[y];
              
              const rawValue = data[ageBin]?.channels[channel] || 0;
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
        {ageBins.map(ageBin => renderBreakdown(ageBin))}
      </BreakdownContainer> */}
    </WidgetContainer>
  );
};

AgeVsDiscovery.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default AgeVsDiscovery;