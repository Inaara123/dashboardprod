import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../supabaseClient';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const patientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const PatientLocationWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [patientLocations, setPatientLocations] = useState([]);
  const [statistics, setStatistics] = useState({
    lessThan1km: 0,
    oneToTwoKm: 0,
    twoToFiveKm: 0,
    moreThanFiveKm: 0,
    nanValues: 0,
    total: 0,
  });

  // Memoize hospital position
  const hospitalPosition = useMemo(() => {
    if (!hospitalData?.location?.coordinates) return null;
    return [hospitalData.location.coordinates[1], hospitalData.location.coordinates[0]];
  }, [hospitalData]);

  // Memoize circles
  const circles = useMemo(() => {
    if (!hospitalPosition) return [];
    return [1, 2, 3, 4, 5].map(radius => (
      <Circle
        key={radius}
        center={hospitalPosition}
        radius={radius * 1000}
        pathOptions={{ 
          color: '#3388ff',
          fillColor: '#3388ff',
          fillOpacity: 0.1,
          weight: 1
        }}
      />
    ));
  }, [hospitalPosition]);

  // Memoize patient markers
  const patientMarkers = useMemo(() => {
    return patientLocations.map((patient, index) => (
      <Marker
        key={`patient-${index}`}
        position={[patient.latitude, patient.longitude]}
        icon={patientIcon}
      />
    ));
  }, [patientLocations]);

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
    
    return {
      startDateTime: currentStart,
      endDateTime: currentEnd
    };
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch hospital data
        const { data: hospital, error: hospitalError } = await supabase
          .from('hospitals')
          .select('name, location')
          .eq('hospital_id', hospitalId)
          .single();

        if (hospitalError) {
          console.error('Hospital fetch error:', hospitalError);
          throw new Error(`Failed to fetch hospital data: ${hospitalError.message}`);
        }
        
        if (!isMounted) return;

        if (!hospital?.location?.coordinates?.length === 2) {
          throw new Error('Invalid hospital coordinates');
        }

        setHospitalData(hospital);

        // Get time range
        const { startDateTime, endDateTime } = getTimeRanges();
        console.log('Time range:', { startDateTime, endDateTime });

        // Build query for appointments with patient data
        let query = supabase
          .from('appointments')
          .select(`
            appointment_time,
            patient_id,
            patients (
              latitude,
              longitude,
              distance_travelled
            )
          `)
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', formatDate(startDateTime))
          .lte('appointment_time', formatDate(endDateTime));

        // Add doctor filter if specified
        if (doctorId !== 'all') {
          query = query.eq('doctor_id', doctorId);
        }

        const { data: patientData, error: patientError } = await query;

        if (patientError) {
          console.error('Patient data fetch error:', patientError);
          throw new Error(`Failed to fetch patient data: ${patientError.message}`);
        }

        console.log('Patient data received:', patientData);

        if (!isMounted) return;

        // Calculate statistics
        const stats = {
          lessThan1km: 0,
          oneToTwoKm: 0,
          twoToFiveKm: 0,
          moreThanFiveKm: 0,
          nanValues: 0,
          total: patientData.length,
        };

        const validPatients = patientData
          .filter(appointment => {
            if (!appointment.patients) {
              console.warn('No patient data for appointment:', appointment);
              stats.nanValues++;
              return false;
            }

            const distance = appointment.patients.distance_travelled;

            if (distance === null || distance === undefined || isNaN(distance)) {
              console.warn('Invalid distance for patient:', appointment.patient_id);
              stats.nanValues++;
              return false;
            }

            if (distance < 1) stats.lessThan1km++;
            else if (distance < 2) stats.oneToTwoKm++;
            else if (distance < 5) stats.twoToFiveKm++;
            else stats.moreThanFiveKm++;

            return true;
          })
          .map(appointment => ({
            latitude: appointment.patients.latitude,
            longitude: appointment.patients.longitude
          }));

        if (!isMounted) return;
        
        setPatientLocations(validPatients);
        setStatistics(stats);
        
      } catch (err) {
        if (isMounted) {
          const errorMessage = err.message || 'Unknown error occurred';
          console.error('Detailed error:', err);
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (loading) {
    return <div className="loading-spinner">Loading map data...</div>;
  }

  if (error) {
    return <div className="error-message">Error loading map: {error}</div>;
  }

  if (!hospitalPosition) {
    return <div className="error-message">Invalid hospital location data</div>;
  }

  return (
    <div className="patient-location-widget">
      <h2>{hospitalData.name} - Patient Distribution</h2>
      
      <div className="map-container">
        <MapContainer
          center={hospitalPosition}
          zoom={13}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <Marker position={hospitalPosition} icon={hospitalIcon}>
            <Popup>{hospitalData.name}</Popup>
          </Marker>

          {circles}
          {patientMarkers}
        </MapContainer>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        {Object.entries(statistics).map(([key, value]) => (
          <div key={key} style={{
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <p style={{ margin: 0, color: '#666' }}>
              {value} ({((value/statistics.total)*100).toFixed(1)}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientLocationWidget;