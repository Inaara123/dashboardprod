import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// Custom Modal Component
const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1E2023',
        borderRadius: '10px',
        padding: '20px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            margin: 0,
            color: '#F0F2F5',
            fontSize: '18px',
            fontWeight: '600'
          }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '5px'
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const DiscoveryWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [discoveries, setDiscoveries] = useState([]);
  const [referralDetails, setReferralDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPercentage, setShowPercentage] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [discoverySettings, setDiscoverySettings] = useState(null);
  const [hasReferrals, setHasReferrals] = useState(false);

  // Default sources - only used when discovery_settings is null
  const defaultSources = [
    'Friends & Family',
    'Google',
    'Facebook',
    'Instagram',
    'Others'
  ];

  // Base colors for visualization
  const baseColors = {
    'Referrals': '#9C27B0',  // Purple for referrals
    default: '#4285F4'       // Default blue for other sources
  };

  // Get color for a source - simple color assignment
  const getSourceColor = (source) => {
    if (source === 'Referrals') return baseColors.Referrals;
    return baseColors.default;
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
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        break;
      default:
        currentStart = today;
        currentEnd = now;
    }
    return { currentStart, currentEnd };
  };

  const fetchHospitalSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('discovery_settings')
        .eq('hospital_id', hospitalId)
        .single();
  
      if (error) throw error;
  
      // If discovery_settings is null, set the default configuration
      if (!data.discovery_settings) {
        setDiscoverySettings({
          main_sources: defaultSources,
          partner_sources: []
        });
      } else {
        // If discovery_settings exists, use it as is
        setDiscoverySettings(data.discovery_settings);
      }
    } catch (error) {
      console.error('Error fetching hospital settings:', error);
      // On error, also set the default configuration
      setDiscoverySettings({
          main_sources: defaultSources,
          partner_sources: []
      });
    }
  };

  const processDiscoveryData = (data) => {
    // Use whatever sources are in settings, or defaults if settings is null
    const sources = discoverySettings?.main_sources || defaultSources;
    
    // Initialize counts ONLY for the sources
    const discoveryCounts = sources.reduce((acc, source) => {
      acc[source] = 0;
      return acc;
    }, {});
  
    let referralSourceCounts = {};
    let hasAnyReferrals = false;
  
    // Process each record
    data.forEach(item => {
      const source = item.patients.how_did_you_get_to_know_us;
      
      if (source.startsWith('referralSource:')) {
        const referralDoctor = source.split(':')[1];
        referralSourceCounts[referralDoctor] = (referralSourceCounts[referralDoctor] || 0) + 1;
        hasAnyReferrals = true;
        // Don't add to discoveryCounts yet
      } else {
        // Count only if source exists in our sources array
        if (sources.includes(source)) {
          discoveryCounts[source]++;
        }
      }
    });
  
    setHasReferrals(hasAnyReferrals);
  
    // Format main discoveries data - only add Referrals if we found any
    let mainDiscoveries = sources.map(source => ({
      source,
      count: discoveryCounts[source] || 0,
      percentage: ((discoveryCounts[source] || 0) / (data.length || 1)) * 100
    }));
  
    // Only add Referrals category if we found referral sources
    if (hasAnyReferrals) {
      const totalReferrals = Object.values(referralSourceCounts).reduce((a, b) => a + b, 0);
      mainDiscoveries.push({
        source: 'Referrals',
        count: totalReferrals,
        percentage: (totalReferrals / (data.length || 1)) * 100
      });
    }
  
    mainDiscoveries = mainDiscoveries.sort((a, b) => b.count - a.count);
  
    // Format referral details
    const referralDetailsArray = Object.entries(referralSourceCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage: (count / (data.length || 1)) * 100
      }))
      .sort((a, b) => b.count - a.count);
  
    setDiscoveries(mainDiscoveries);
    setReferralDetails(referralDetailsArray);
    setTotalVisits(data.length);
  };
  const fetchDiscoveries = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();

      let query = supabase
        .from('appointments')
        .select(`
          patient_id,
          patients!inner(how_did_you_get_to_know_us)
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', formatDate(currentStart))
        .lte('appointment_time', formatDate(currentEnd));

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      processDiscoveryData(data);
    } catch (error) {
      console.error('Error fetching discoveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId) {
      fetchHospitalSettings();
    }
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchDiscoveries();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate, discoverySettings]);

  const getMaxValue = (data) => {
    if (!data.length) return 0;
    return showPercentage 
      ? Math.max(...data.map(disc => disc.percentage))
      : Math.max(...data.map(disc => disc.count));
  };

  const BarChart = ({ data }) => (
    <div style={{ marginBottom: '15px' }}>
      {data.map((discovery, index) => (
        <div key={index} style={{ marginBottom: '10px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '5px'
          }}>
            <span style={{ 
              fontSize: '14px',
              color: '#F0F2F5'
            }}>{discovery.source}</span>
            <span style={{ 
              fontSize: '14px',
              color: '#F0F2F5'
            }}>
              {showPercentage 
                ? `${discovery.percentage.toFixed(1)}%`
                : discovery.count
              }
            </span>
          </div>
          <div style={{
            width: '100%',
            backgroundColor: '#2D3035',
            borderRadius: '4px',
            height: '8px'
          }}>
            <div style={{
              width: `${(showPercentage ? discovery.percentage : discovery.count) / getMaxValue(data) * 100}%`,
              backgroundColor: getSourceColor(discovery.source),
              height: '100%',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}/>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#1E2023',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'inline-block',
      minWidth: '300px',
      maxWidth: '400px',
      height: 'fit-content'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          margin: 0,
          color: '#F0F2F5',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Discovery Sources
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px'
        }}>
          <span style={{ fontSize: '12px', color: '#666' }}>Count</span>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '32px',
            height: '18px',
          }}>
            <input
              type="checkbox"
              checked={showPercentage}
              onChange={() => setShowPercentage(!showPercentage)}
              style={{
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: showPercentage ? '#007bff' : '#ccc',
              transition: '0.4s',
              borderRadius: '34px',
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '14px',
                width: '14px',
                left: showPercentage ? '16px' : '2px',
                bottom: '2px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%',
              }}/>
            </span>
          </label>
          <span style={{ fontSize: '12px', color: '#666' }}>%</span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#F0F2F5' }}>Loading...</div>
      ) : (
        <>
          <BarChart data={discoveries} />
          
          {hasReferrals && (
            <div 
              style={{ 
                textAlign: 'center',
                marginTop: '10px'
              }}
            >
              <button
                onClick={() => setShowReferralModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                Show all referral sources
              </button>
            </div>
          )}

          <Modal 
            isOpen={showReferralModal} 
            onClose={() => setShowReferralModal(false)}
            title="Referral Sources Breakdown"
          >
            <div style={{ padding: '20px' }}>
              <BarChart data={referralDetails} />
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default DiscoveryWidget;