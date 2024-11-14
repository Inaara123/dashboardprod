import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
  Cell
} from 'recharts';

const DailyDistributionWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const dayColors = {
    'Sunday': '#FF9800',
    'Monday': '#4CAF50',
    'Tuesday': '#2196F3',
    'Wednesday': '#9C27B0',
    'Thursday': '#F44336',
    'Friday': '#009688',
    'Saturday': '#795548'
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
      try {
        setIsLoading(true);
        setError(null);

        let startDateTime = new Date();
        let endDateTime = new Date();

        switch (timeRange) {
          case '1day':
            startDateTime.setDate(startDateTime.getDate() - 1);
            break;
          case '1week':
            startDateTime.setDate(startDateTime.getDate() - 7);
            break;
          case '1month':
            startDateTime.setMonth(startDateTime.getMonth() - 1);
            break;
          case '3months':
            startDateTime.setMonth(startDateTime.getMonth() - 3);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateTime = new Date(startDate);
              endDateTime = new Date(endDate);
            }
            break;
          default:
            startDateTime.setDate(startDateTime.getDate() - 1);
        }


        let query = supabase
          .from('appointments')
          .select('appointment_time')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(startDateTime))
          .lte('appointment_time', formatDate(endDateTime));

        if (doctorId !== 'all') {
          query = query.eq('doctor_id', doctorId);
        }

        const { data: appointments, error: queryError } = await query;
        if (queryError) throw queryError;

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const dayCounts = {};
        const dayOccurrences = {};
        dayNames.forEach(day => {
          dayCounts[day] = 0;
          dayOccurrences[day] = 0;
        });

        let currentDate = new Date(startDateTime);
        while (currentDate <= endDateTime) {
          const dayName = dayNames[currentDate.getDay()];
          dayOccurrences[dayName]++;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        appointments.forEach(appointment => {
          const date = new Date(appointment.appointment_time);
          const dayName = dayNames[date.getDay()];
          dayCounts[dayName]++;
        });

        const total = appointments.length;

        const chartData = Object.entries(dayCounts).map(([day, count]) => ({
          name: day,
          value: count,
          percentage: total > 0 ? (count / total * 100).toFixed(1) : 0,
          average: Math.round(dayOccurrences[day] > 0 ? count / dayOccurrences[day] : 0),
          fill: dayColors[day]
        }));

        setData(chartData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) return (
    <div style={{
      ...styles.fullWidthWidget,
      backgroundColor: '#1E2023',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        ...styles.header,
        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          ...styles.title,
          color: '#ffffff'
        }}>Daily Patient Distribution</h3>
      </div>
      <div style={{
        ...styles.loading,
        color: 'rgba(255, 255, 255, 0.7)'
      }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={{
      ...styles.fullWidthWidget,
      backgroundColor: '#1E2023',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
        ...styles.header,
        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          ...styles.title,
          color: '#ffffff'
        }}>Daily Patient Distribution</h3>
      </div>
      <div style={styles.error}>{error}</div>
    </div>
  );

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const getGradientColor = (day) => {
    const gradients = {
      'Sunday': { start: '#FF6B6B', end: '#FF8E8E' },
      'Monday': { start: '#4ED6B3', end: '#7EECD1' },
      'Tuesday': { start: '#7795F8', end: '#7795F8' },
      'Wednesday': { start: '#9B6FFF', end: '#B794F4' },
      'Thursday': { start: '#FF9F43', end: '#FFB976' },
      'Friday': { start: '#56CCF2', end: '#2F80ED' },
      'Saturday': { start: '#FF7EB3', end: '#FF99C3' }
    };
    return gradients[day];
  };

  return (
    <div style={{
      ...styles.fullWidthWidget,
      backgroundColor: '#1E2023',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    }}>
      <div style={{
        ...styles.header,
        borderBottom: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          ...styles.title,
          background: 'linear-gradient(45deg, #E0E0E0, #FFFFFF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Daily Patient Distribution</h3>
        <div style={{
          ...styles.totalAppointments,
          background: 'linear-gradient(45deg, #E0E0E0, #FFFFFF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Total Appointments: {total}
        </div>
      </div>
      
      <div style={{
        ...styles.summary,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {data.map(item => {
          const gradientColor = getGradientColor(item.name);
          return (
            <div key={item.name} style={{
              ...styles.summaryItem,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderLeft: `4px solid ${gradientColor.start}`,
              background: `linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}>
              <span style={{
                ...styles.summaryLabel,
                color: 'rgba(255, 255, 255, 0.9)'
              }}>{item.name}</span>
              <span style={{
                ...styles.summaryValue,
                background: 'linear-gradient(45deg, #E0E0E0, #FFFFFF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {item.value} ({item.percentage}%)
              </span>
              <span style={{
                ...styles.summaryAverage,
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                Average: {item.average}/day
              </span>
            </div>
          );
        })}
      </div>

      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 40, right: 30, left: 40, bottom: 20 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255, 255, 255, 0.05)"
            />
            <XAxis 
              type="category" 
              dataKey="name"
              tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.7)' }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              height={60}
              interval={0}
            />
            <YAxis 
              type="number" 
              domain={[0, 'auto']}
              tick={{ fontSize: 12, fill: 'rgba(255, 255, 255, 0.7)' }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
              label={{ 
                value: 'Number of Appointments', 
                angle: -90, 
                position: 'insideLeft', 
                offset: -20,
                style: { fill: 'rgba(255, 255, 255, 0.7)' }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 32, 35, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                color: '#ffffff',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
              formatter={(value, name, props) => [
                `${value} appointments (${props.payload.percentage}%)
Daily Average: ${props.payload.average}`,
                props.payload.name
              ]}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
            <Bar 
              dataKey="value"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => {
                const gradientColor = getGradientColor(entry.name);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${entry.name})`}
                  />
                );
              })}
              <LabelList
                dataKey="value"
                position="top"
                content={(props) => {
                  if (!props || !props.payload) return null;
                  
                  const { x, y, width, payload } = props;
                  const text = `${payload.value} (${payload.percentage}%)
Avg: ${payload.average}`;
                  const textWidth = Math.max(...text.split('\n').map(t => t.length)) * 7;
                  const rectWidth = textWidth + 20;
                  const lines = text.split('\n');
                  
                  return (
                    <g>
                      <rect
                        x={x + width/2 - rectWidth/2}
                        y={y - 35}
                        width={rectWidth}
                        height="30"
                        fill="rgba(30, 32, 35, 0.95)"
                        stroke="rgba(255, 255, 255, 0.1)"
                        rx="6"
                        ry="6"
                      />
                      {lines.map((line, i) => (
                        <text
                          key={i}
                          x={x + width/2}
                          y={y - 20 + (i * 12)}
                          textAnchor="middle"
                          fill="rgba(255, 255, 255, 0.9)"
                          fontSize="12"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                }}
              />
            </Bar>
            {/* Define gradients for each day */}
            <defs>
              {data.map((entry) => {
                const gradientColor = getGradientColor(entry.name);
                return (
                  <linearGradient
                    key={`gradient-${entry.name}`}
                    id={`gradient-${entry.name}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={gradientColor.start} stopOpacity={1} />
                    <stop offset="100%" stopColor={gradientColor.end} stopOpacity={1} />
                  </linearGradient>
                );
              })}
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const styles = {
  fullWidthWidget: {
    width: '100%',
    padding: '24px',
    borderRadius: '8px',
    position: 'relative',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '600',
  },
  totalAppointments: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  chartContainer: {
    height: '400px',
    marginTop: '24px',
    position: 'relative',
    width: "100%"
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    borderRadius: '8px',
  },
  summaryItem: {
    padding: '12px',
    textAlign: 'center',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryLabel: {
    display: 'block',
    fontSize: '1rem',
    marginBottom: '4px',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  summaryAverage: {
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '1.1rem',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#f44336',
    fontSize: '1.1rem',
  }
};

export default DailyDistributionWidget;