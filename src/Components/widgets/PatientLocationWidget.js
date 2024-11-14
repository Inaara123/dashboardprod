import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const getTimeRangeDate = useCallback(() => {
    const now = new Date();
    if (timeRange === 'custom' && startDate && endDate) {
      return { startDateTime: new Date(startDate), endDateTime: new Date(endDate) };
    }

    const timeRanges = {
      '1day': now.setDate(now.getDate() - 1),
      '1week': now.setDate(now.getDate() - 7),
      '1month': now.setMonth(now.getMonth() - 1),
      '3months': now.setMonth(now.getMonth() - 3),
    };

    return {
      startDateTime: new Date(timeRanges[timeRange] || timeRanges['1day']),
      endDateTime: new Date()
    };
  }, [timeRange, startDate, endDate]);

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

        if (hospitalError) throw hospitalError;
        if (!isMounted) return;

        // Validate hospital coordinates
        if (!hospital?.location?.coordinates?.length === 2) {
          throw new Error('Invalid hospital coordinates');
        }

        setHospitalData(hospital);

        // Get time range
        const { startDateTime, endDateTime } = getTimeRangeDate();

        // Build appointments query
        const appointmentsQuery = supabase
          .from('appointments')
          .select('patient_id')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', startDateTime.toISOString())
          .lte('appointment_time', endDateTime.toISOString());

        if (doctorId !== 'all') {
          appointmentsQuery.eq('doctor_id', doctorId);
        }

        const { data: appointments, error: appointmentsError } = await appointmentsQuery;
        if (appointmentsError) throw appointmentsError;
        if (!isMounted) return;

        // Fetch patient locations
        const patientIds = appointments.map(app => app.patient_id);
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('latitude, longitude')
          .in('patient_id', patientIds);

        if (patientsError) throw patientsError;
        if (!isMounted) return;

        // Calculate statistics
        const [hospitalLon, hospitalLat] = hospital.location.coordinates;
        
        const stats = {
          lessThan1km: 0,
          oneToTwoKm: 0,
          twoToFiveKm: 0,
          moreThanFiveKm: 0,
          nanValues: 0,
          total: patients.length,
        };

        const validPatients = patients.filter(patient => {
          const distance = calculateDistance(
            hospitalLat,
            hospitalLon,
            patient.latitude,
            patient.longitude
          );

          if (distance === null) {
            stats.nanValues++;
            return false;
          }

          if (distance < 1) stats.lessThan1km++;
          else if (distance < 2) stats.oneToTwoKm++;
          else if (distance < 5) stats.twoToFiveKm++;
          else stats.moreThanFiveKm++;

          return true;
        });

        if (!isMounted) return;
        
        setPatientLocations(validPatients);
        setStatistics(stats);
        
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          console.error('Error fetching data:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [hospitalId, doctorId, timeRange, startDate, endDate, calculateDistance, getTimeRangeDate]);

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