import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const GenderTrends = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [genderTypes, setGenderTypes] = useState([]);
  const [selectedGender, setSelectedGender] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Updated colors for better visibility on dark background
  const colorPalette = [
    'rgb(46, 197, 255)',   // Bright Blue (Male)
    'rgb(255, 99, 132)',   // Bright Pink (Female)
    'rgb(0, 255, 197)',    // Bright Teal (Other)
  ];

  const getTimeRange = () => {
    const now = new Date();
    let startDateTime = new Date();

    if (timeRange === 'custom' && startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    switch (timeRange) {
      case '1day':
        startDateTime.setDate(now.getDate() - 1);
        break;
      case '1week':
        startDateTime.setDate(now.getDate() - 7);
        break;
      case '1month':
        startDateTime.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDateTime.setMonth(now.getMonth() - 3);
        break;
      default:
        startDateTime.setDate(now.getDate() - 7);
    }

    return {
      start: startDateTime,
      end: now
    };
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
    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate, selectedGender]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const timeConstraint = getTimeRange();

      const { data: genderData, error: genderError } = await supabase
        .from('patients')
        .select('gender')
        .neq('gender', null)
        .limit(1000);

      if (genderError) throw genderError;

      const uniqueGenders = [...new Set(
        genderData
          .map(d => d.gender)
          .filter(Boolean)
      )];
      setGenderTypes(uniqueGenders);

      let query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_time,
          patient_id,
          patients (
            gender
          )
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(timeConstraint.start))
        .lte('appointment_time', formatDate(timeConstraint.end))
        .order('appointment_time', { ascending: true });

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data: appointmentsData, error: appointmentsError } = await query;
      if (appointmentsError) throw appointmentsError;

      const dailyData = new Map();
      
      appointmentsData.forEach(appointment => {
        const date = new Date(appointment.appointment_time).toLocaleDateString();
        const gender = appointment.patients?.gender;

        if (!gender) return;

        if (!dailyData.has(date)) {
          dailyData.set(date, {});
          uniqueGenders.forEach(g => dailyData.get(date)[g] = 0);
        }

        dailyData.get(date)[gender]++;
      });

      const dates = Array.from(dailyData.keys()).sort((a, b) => 
        new Date(a) - new Date(b)
      );

      const datasets = selectedGender === 'all'
        ? uniqueGenders.map((gender, index) => ({
            label: gender,
            data: dates.map(date => dailyData.get(date)[gender] || 0),
            borderColor: colorPalette[index % colorPalette.length],
            backgroundColor: colorPalette[index % colorPalette.length],
            tension: 0.4,
            fill: false
          }))
        : [{
            label: selectedGender,
            data: dates.map(date => dailyData.get(date)[selectedGender] || 0),
            borderColor: colorPalette[0],
            backgroundColor: colorPalette[0],
            tension: 0.4,
            fill: false
          }];

      setChartData({
        labels: dates,
        datasets: datasets
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',  // White text for legend labels
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Patient Gender Distribution Trends',
        color: '#ffffff',    // White text for title
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#ffffff',  // White text for y-axis ticks
          stepSize: 1
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'  // Subtle white grid lines
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#ffffff'  // White text for x-axis ticks
        }
      }
    },
    elements: {
      point: {
        radius: 3,
        hitRadius: 10,
        hoverRadius: 5
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '400px',
      backgroundColor: '#1E2023',  // Dark background
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '14px',
            minWidth: '200px',
            backgroundColor: '#2A2D31',  // Slightly lighter than background
            color: '#ffffff',
            outline: 'none'
          }}
        >
          <option value="all">All Genders</option>
          {genderTypes.map(gender => (
            <option key={gender} value={gender}>
              {gender}
            </option>
          ))}
        </select>
      </div>
      
      {isLoading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px',
          color: '#ffffff'  // White text for loading indicator
        }}>
          Loading...
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
};

export default GenderTrends;