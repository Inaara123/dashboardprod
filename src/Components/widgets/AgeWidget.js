import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Box,
  Typography,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const AgeWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [ageCounts, setAgeCounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [showPercentages, setShowPercentages] = useState(false);
  const barColors = [
    '#4299E1', // Blue
    '#68D391', // Green
    '#9F7AEA', // Purple
    '#F6AD55', // Orange
    '#FC8181', // Red
    '#63B3ED', // Light Blue
    '#4FD1C5', // Teal
    '#F687B3', // Pink
  ];

  const defaultAgeBins = [
    { id: 'bin-1', start: '<', end: '20', count: 0 },
    { id: 'bin-2', start: '20', end: '25', count: 0 },
    { id: 'bin-3', start: '25', end: '30', count: 0 },
    { id: 'bin-4', start: '30', end: '35', count: 0 },
    { id: 'bin-5', start: '35', end: '40', count: 0 },
    { id: 'bin-6', start: '40', end: '50', count: 0 },
    { id: 'bin-7', start: '50', end: '60', count: 0 },
    { id: 'bin-8', start: '60', end: '>', count: 0 },
  ];

  const [ageBins, setAgeBins] = useState(defaultAgeBins);
  const [tempBins, setTempBins] = useState(defaultAgeBins);

  // Elegant gradient colors for bars
  const gradientOffset = () => {
    return {
      offset: '0%',
      stopColor: '#4158D0',
    };
  };

  useEffect(() => {
    fetchStoredAgeBins();
  }, [hospitalId]);

  useEffect(() => {
    if (ageBins.length > 0) {
      fetchAgeData();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate, ageBins]); // Include ageBins in dependency array

  const fetchStoredAgeBins = async () => {
    if (!hospitalId) return;
    
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('age_settings')
        .eq('hospital_id', hospitalId)
        .single();
  
      if (error) throw error;
      
      if (data?.age_settings) {
        const sortedBins = [...data.age_settings].sort((a, b) => {
          if (a.start === '<') return -1;
          if (b.start === '<') return 1;
          if (a.end === '>') return 1;
          if (b.end === '>') return -1;
          return parseInt(a.start) - parseInt(b.start);
        });
        setAgeBins(sortedBins);
        setTempBins(sortedBins);
      } else {
        // If no age_settings exist, save and use default bins
        console.log('No age settings found, saving default bins...');
        await saveAgeBins(defaultAgeBins);
        setAgeBins(defaultAgeBins);
        setTempBins(defaultAgeBins);
      }
    } catch (error) {
      console.error('Error fetching age bins:', error);
      // Even if there's an error, we'll use default bins locally
      setAgeBins(defaultAgeBins);
      setTempBins(defaultAgeBins);
    }
  };

  const saveAgeBins = async (bins) => {
    try {
      const sortedBins = bins.sort((a, b) => {
        if (a.start === '<') return -1;
        if (b.start === '<') return 1;
        if (a.end === '>') return 1;
        if (b.end === '>') return -1;
        return parseInt(a.start) - parseInt(b.start);
      });

      const { error } = await supabase
        .from('hospitals')
        .update({ age_settings: sortedBins })
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      
      // Update state immediately after successful save
      setAgeBins(sortedBins);
      setTempBins(sortedBins);
    } catch (error) {
      console.error('Error saving age bins:', error);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().split('.')[0].replace('T', ' ');
  };

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

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const fetchAgeData = async () => {
    if (!hospitalId || !doctorId) return;

    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();
      
      const query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          patient_id,
          patients (
            date_of_birth
          )
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(currentStart))
        .lte('appointment_time', formatDate(currentEnd));

      if (doctorId !== 'all') {
        query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate age counts using current ageBins
      const newAgeCounts = [...ageBins].map(bin => ({ ...bin, count: 0 }));
      
      data.forEach(appointment => {
        const age = calculateAge(appointment.patients?.date_of_birth);
        if (age === null) return;

        for (let bin of newAgeCounts) {
          if (bin.start === '<' && age < parseInt(bin.end)) {
            bin.count++;
            break;
          } else if (bin.end === '>' && age >= parseInt(bin.start)) {
            bin.count++;
            break;
          } else if (age >= parseInt(bin.start) && age < parseInt(bin.end)) {
            bin.count++;
            break;
          }
        }
      });

      setAgeCounts(newAgeCounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching age data:', error);
      setLoading(false);
    }
  };

  const handleAddBin = () => {
    const newBin = {
      id: `bin-${tempBins.length + 1}`,
      start: '',
      end: '',
      count: 0
    };
    setTempBins([...tempBins, newBin]);
  };

  const handleDeleteBin = (binId) => {
    setTempBins(tempBins.filter(bin => bin.id !== binId));
  };

  const handleBinChange = (binId, field, value) => {
    setTempBins(tempBins.map(bin =>
      bin.id === binId ? { ...bin, [field]: value } : bin
    ));
  };

  const handleSaveBins = async () => {
    await saveAgeBins(tempBins);
    setOpenDialog(false);
  };

  const getVolumeColor = (count, maxCount) => {
    const ratio = count / maxCount;
    if (ratio >= 0.7) return 'rgba(52, 211, 153, 0.1)'; // Green for high volume
    if (ratio >= 0.3) return 'rgba(59, 130, 246, 0.1)'; // Blue for medium volume
    return 'rgba(239, 68, 68, 0.1)'; // Red for low volume
  };

  const getTextColor = (count, maxCount) => {
    const ratio = count / maxCount;
    if (ratio >= 0.7) return 'rgb(52, 211, 153)'; // Green text
    if (ratio >= 0.3) return 'rgb(59, 130, 246)'; // Blue text
    return 'rgb(239, 68, 68)'; // Red text
  };

  const renderStatsPanel = () => {
    const maxCount = Math.max(...ageCounts.map(bin => bin.count));
    const totalCount = ageCounts.reduce((sum, bin) => sum + bin.count, 0);

    return (
      <Box 
        sx={{
          width: '280px',
          height: '300px',
          overflowY: 'auto',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '16px',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
          },
        }}
      >
        {ageCounts.map((bin) => {
          const percentage = totalCount > 0 ? ((bin.count / totalCount) * 100).toFixed(1) : '0';
          return (
            <Box
              key={bin.id}
              sx={{
                backgroundColor: getVolumeColor(bin.count, maxCount),
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                Age {bin.start}-{bin.end}
              </Typography>
              <Typography
                sx={{
                  color: getTextColor(bin.count, maxCount),
                  fontSize: '1.125rem',
                  fontWeight: 600,
                }}
              >
                {bin.count} patients ({percentage}%)
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, count, percentage } = payload[0].payload;
      return (
        <Paper
          sx={{
            backgroundColor: 'rgba(30, 32, 35, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
            {name}
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
            Count: {count}
          </Typography>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.875rem' }}>
            Percentage: {percentage}%
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  const totalCount = ageCounts.reduce((sum, bin) => sum + bin.count, 0);

  const chartData = ageCounts.map(bin => {
    const percentage = totalCount > 0 ? (bin.count / totalCount) * 100 : 0;
    return {
      name: `${bin.start}-${bin.end}`,
      count: bin.count,
      percentage: parseFloat(percentage.toFixed(1)),
    };
  });
  const renderCustomDialog = () => {
    return (
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1E2023',
            color: 'white',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          Customize Age Groups
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {tempBins.map((bin, index) => (
            <Box 
              key={bin.id} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2 
              }}
            >
              <TextField
                label="Start Age"
                value={bin.start}
                onChange={(e) => handleBinChange(bin.id, 'start', e.target.value)}
                size="small"
                sx={{
                  width: '100px',
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                }}
              />
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>to</Typography>
              <TextField
                label="End Age"
                value={bin.end}
                onChange={(e) => handleBinChange(bin.id, 'end', e.target.value)}
                size="small"
                sx={{
                  width: '100px',
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                }}
              />
              <IconButton 
                onClick={() => handleDeleteBin(bin.id)}
                disabled={tempBins.length <= 1}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddBin}
            sx={{
              mt: 1,
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.23)',
              '&:hover': {
                borderColor: 'white',
              },
            }}
            variant="outlined"
          >
            Add Age Group
          </Button>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveBins}
            variant="contained"
            sx={{
              background: 'linear-gradient(45deg, #4158D0 30%, #C850C0 90%)',
              color: 'white',
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  };


  if (loading) {
    return (
      <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
        Loading...
      </Typography>
    );
  }

  return (
    <Box sx={{ 
      backgroundColor: '#1E2023', 
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}>
      {renderCustomDialog()}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained"
          onClick={() => setOpenDialog(true)}
          sx={{
            backgroundColor: '#2196F3',
            '&:hover': {
              backgroundColor: '#1976D2',
            },
            color: 'white',
            boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
          }}
        >
          Customize Age Groups
        </Button>
        <Button 
          variant="contained"
          onClick={() => setShowPercentages(!showPercentages)}
          sx={{
            backgroundColor: '#2196F3',
            '&:hover': {
              backgroundColor: '#1976D2',
            },
            color: 'white',
            boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
          }}
        >
          Show {showPercentages ? 'Counts' : 'Percentages'}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
              />
              <YAxis 
                domain={showPercentages ? [0, 100] : [0, 'auto']}
                tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                padding={{ top: 20 }}
              />
              <Tooltip content={renderCustomTooltip} />
              <Bar 
                dataKey={showPercentages ? 'percentage' : 'count'} 
                radius={[4, 4, 0, 0]}
              >
                {
                  chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={barColors[index % barColors.length]}
                      opacity={0.8}
                    />
                  ))
                }
                <LabelList
                  dataKey={showPercentages ? 'percentage' : 'count'}
                  position="top"
                  fill="rgba(255, 255, 255, 0.9)"
                  formatter={(value) => showPercentages ? `${value}%` : value}
                  dy={-4}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
        {/* Update the stats panel to match the bar colors */}
        <Box 
          sx={{
            width: '280px',
            height: '300px',
            overflowY: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '16px',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
            },
          }}
        >
          {ageCounts.map((bin, index) => {
            const percentage = totalCount > 0 ? ((bin.count / totalCount) * 100).toFixed(1) : '0';
            return (
              <Box
                key={bin.id}
                sx={{
                  backgroundColor: `${barColors[index % barColors.length]}15`, // Using color with 15% opacity
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  Age {bin.start}-{bin.end}
                </Typography>
                <Typography
                  sx={{
                    color: barColors[index % barColors.length],
                    fontSize: '1.125rem',
                    fontWeight: 600,
                  }}
                >
                  {bin.count} patients ({percentage}%)
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default AgeWidget;