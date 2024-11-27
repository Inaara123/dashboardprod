// src/components/Home.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { supabase } from '../supabaseClient';
import VisitsWidget from './widgets/VisitsWidjet';
import LocationsWidget from './widgets/LocationsWidget'; 
import DiscoveryWidget from './widgets/DiscoveryWidget';
import GenderWidget from './widgets/GenderWidget';
import OldVsNewWidget from './widgets/OldVsNewWidget';
import BookingTypeWidget from './widgets/BookingTypeWidget';
import TimeAnalysisWidget from './widgets/TimeAnalysisWidget';
import DailyDistributionWidget from './widgets/DailyDistributionWidget';
import TimeDistributionWidget from './widgets/TimeDistributionWidget';
import AgeWidget from './widgets/AgeWidget';
import PatientLocationWidget from './widgets/PatientLocationWidget';
import CorrelationsBoard from './widgets/CorrelationsBoard';
import GenderVsDay from './widgets/GendervsDay';
import GenderVsBooking from './widgets/GenderVsBooking';
import GenderVsLocation from './widgets/GenderVsLocation';
import AgeVsGender from './widgets/AgeVsGender';
import AgeVsDiscovery from './widgets/AgeVsDiscovery';
import LocationVsAge from './widgets/LocationVsAge';
import LocationVsDiscovery from './widgets/LocationVsDiscovery';
import DiscoveryTrends from './widgets/DiscoveryTrends';
import GenderTrends from './widgets/GenderTrends';
import LocationTrends from './widgets/LocationTrends';
import BookingTrends from './widgets/BookingTrends';
import Correlation from './widgets/Correlation';
const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [administrator, setAdministrator] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('1day');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchAdministrator = async () => {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('administrator')
          .eq('hospital_id', currentUser.uid)
          .single();

        if (error) throw error;
        if (data) {
          setAdministrator(data.administrator);
        }
      } catch (error) {
        console.error('Error fetching administrator:', error);
      }
    };

    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('doctor_id, name')
          .eq('hospital_id', currentUser.uid);

        if (error) throw error;
        if (data) {
          setDoctors(data);
          if (data.length === 1) {
            setSelectedDoctorId(data[0].doctor_id);
          } else {
            setSelectedDoctorId('all');
          }
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    if (currentUser) {
      fetchAdministrator();
      fetchDoctors();
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleTimeRangeClick = (range) => {
    setSelectedTimeRange(range);
    setShowCustomDates(range === 'custom');
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleDoctorChange = (event) => {
    const doctorId = event.target.value;
    setSelectedDoctorId(doctorId);
  };


return (
  <div style={{ 
    padding: '24px',
    backgroundColor: '#131517', // Dark background
    minHeight: '100vh',
    color: '#e0e0e0' // Light text color
  }}>
    {/* Header section */}
    <div style={{ 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center',
  marginBottom: '0px',
  background: 'linear-gradient(145deg, #1E2023, #23262B)',
  padding: '24px 32px',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }}>
    <span style={{
      fontSize: '36px',
      fontWeight: '300',
      color: 'white',
      fontStyle: 'italic',  // Added italic style

      //fontFamily: 'Tangerine, cursive', // Cursive font
      textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
    }}>
      Hello,
    </span>
    <span style={{
      fontSize: '28px',
      fontStyle: 'italic',
      color: '#E5E7EB',
      fontWeight: '500',
    }}>
      {administrator}
    </span>
  </div>

  <div style={{
    textAlign: 'center',
    flex: 1,
  }}>
    <div style={{
      fontSize: '32px',
      fontWeight: '600',
      color: 'white',
      marginBottom: '4px',
      letterSpacing: '0.5px'
    }}>
      NeoFlow Analytica
    </div>
    <div style={{
      fontSize: '14px',
      color: '#9CA3AF',
      fontStyle: 'italic',
      letterSpacing: '0.5px',
    }}>
      a product of inaara.ai
    </div>
  </div>

  <button 
    onClick={handleLogout}
    style={{
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontWeight: '500',
      fontSize: '15px',
      boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}
    onMouseOver={(e) => {
      e.target.style.transform = 'translateY(-1px)';
      e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
    }}
    onMouseOut={(e) => {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 2px 10px rgba(59, 130, 246, 0.3)';
    }}
  >
    <svg
      style={{ width: '16px', height: '16px' }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    Logout
  </button>
</div>
      <div style={{
  minHeight: '100vh',
  backgroundColor: '#17181A',
  color: 'white',
  padding: '40px 20px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
}}>
  {/* Chatbot Preview Section */}
  <div style={{
    backgroundColor: '#1E2023',
    padding: '40px',
    borderRadius: '24px',
    marginBottom: '3px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)'
  }}>
    <div style={{
      textAlign: 'center',
      marginBottom: '40px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '-12px',
        right: '20px',
        background: 'rgba(236,110,173,0.15)',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#EC6EAD',
        fontWeight: '600',
        letterSpacing: '1px',
        border: '1px solid rgba(236,110,173,0.3)',
        textTransform: 'uppercase',
        animation: 'pulse 2s infinite ease-in-out'
      }}>
        Beta
      </div>
      <h2 style={{ 
        fontSize: '32px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #3494E6, #EC6EAD)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '12px',
        letterSpacing: '-0.5px'
      }}>
        Meet Aida
      </h2>
      <p style={{
        color: 'rgba(255,255,255,0.7)',
        fontSize: '17px',
        margin: '0',
        letterSpacing: '0.3px'
      }}>Your Intelligent AI Assistant</p>
    </div>

    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative',
      padding: '28px',
      background: 'rgba(30,32,35,0.6)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
    }}>
      {/* Question */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3494E6, #EC6EAD)',
          padding: '18px 24px',
          borderRadius: '20px 20px 4px 20px',
          maxWidth: '60%',
          boxShadow: '0 4px 15px rgba(52,148,230,0.2)',
          animation: 'slideLeft 0.5s ease-out'
        }}>
          <p style={{ 
            margin: 0, 
            color: 'white',
            fontSize: '15px',
            lineHeight: '1.6',
            fontWeight: '500'
          }}>
            How many patients visited my clinic through google in the last 10 days?
          </p>
        </div>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#ffffff',
          border: '2px solid rgba(255,255,255,0.1)',
          fontWeight: '600'
        }}>
          You
        </div>
      </div>

      {/* Answer */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #3494E6, #EC6EAD)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: 'white',
          fontWeight: '600',
          boxShadow: '0 4px 15px rgba(52,148,230,0.2)'
        }}>
          AI
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          padding: '18px 24px',
          borderRadius: '20px 20px 20px 4px',
          maxWidth: '60%',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          animation: 'slideRight 0.5s ease-out',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <p style={{ 
            margin: 0, 
            color: 'rgba(255,255,255,0.9)',
            fontSize: '15px',
            lineHeight: '1.6',
            fontWeight: '500'
          }}>
            84 patients visited your clinic through google in the last 10 days.
          </p>
        </div>
      </div>

      {/* Chat Button */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: '32px'
      }}>
        <button
          onClick={() => navigate('/aibot')}
          style={{
            padding: '20px 48px',
            background: '#7667B0',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '17px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(52,148,230,0.25)',
            letterSpacing: '0.5px',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 12px 30px rgba(52,148,230,0.35)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(52,148,230,0.25)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            Start Conversation
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                marginLeft: '4px',
                transition: 'transform 0.3s ease'
              }}
            >
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
        <div style={{
          marginTop: '12px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          AI-powered responses in your finger tips
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  {`
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @keyframes slideLeft {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes slideRight {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    button:hover svg {
      transform: translateX(4px);
    }
  `}
</style>


    {/* Controls section */}
    <div style={{ 
      backgroundColor: '#2e2e2e',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '2px',
      marginTop:'-20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
      }}>
        {doctors.length > 1 && (
          <select 
            value={selectedDoctorId}
            onChange={handleDoctorChange}
            style={{
              padding: '10px',
              fontSize: '16px',
              borderRadius: '4px',
              width: '200px',
              border: '1px solid #444',
              cursor: 'pointer',
              marginRight: '20px',
              backgroundColor: '#3b3f44',
              color: '#e0e0e0'
            }}
          >
            <option value="all">All Doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.doctor_id} value={doctor.doctor_id}>
                {doctor.name}
              </option>
            ))}
          </select>
        )}

        {/* Time range buttons */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          flex: 1
        }}>
          {['1day', '1week', '1month', '3months', 'custom'].map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeClick(range)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: selectedTimeRange === range ? '#3a8dff' : '#4b4b4b',
                color: selectedTimeRange === range ? 'white' : '#e0e0e0',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
              onMouseOver={(e) => {
                if (selectedTimeRange !== range) {
                  e.target.style.backgroundColor = '#5a5a5a';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={(e) => {
                if (selectedTimeRange !== range) {
                  e.target.style.backgroundColor = '#4b4b4b';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {range === 'custom' ? 'Custom' : range.replace(/(\d+)/, '$1 ').charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date inputs */}
      {showCustomDates && (
        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center'
        }}>
          <div>
            <label 
              htmlFor="startDate" 
              style={{ 
                marginRight: '8px',
                fontSize: '14px',
                color: '#e0e0e0'
              }}
            >
              Start Date:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                fontSize: '14px',
                backgroundColor: '#3b3f44',
                color: '#e0e0e0'
              }}
            />
          </div>
          <div>
            <label 
              htmlFor="endDate" 
              style={{ 
                marginRight: '8px',
                fontSize: '14px',
                color: '#e0e0e0'
              }}
            >
              End Date:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                fontSize: '14px',
                backgroundColor: '#3b3f44',
                color: '#e0e0e0'
              }}
            />
          </div>
        </div>
      )}
    </div>

    {/* Dashboard Grid */}
    <div style={{ 
      display: 'grid',
      gap: '24px',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gridAutoRows: 'minmax(200px, auto)'
    }}>
      {/* First Row - Left Column (Stacked Visits and OldVsNew) */}
      <div style={{ 
        gridColumn: 'span 3',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Visits Widget */}
        <div style={{ 
  backgroundColor: '#1E2023',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 12px rgba(0,0,0,0.4)'
  }
}}>
  <VisitsWidget 
    hospitalId={currentUser.uid}
    doctorId={selectedDoctorId}
    timeRange={selectedTimeRange}
    startDate={startDate}
    endDate={endDate}
  />
</div>
        {/* OldVsNew Widget */}
        <div style={{ 
          backgroundColor: '#1E2023',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255, 255, 255, 0.2)',

          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 12px rgba(0,0,0,0.4)'
          }
        }}>
          <OldVsNewWidget
            hospitalId={currentUser.uid}
            doctorId={selectedDoctorId}
            timeRange={selectedTimeRange}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      {/* Locations Widget - Wider */}
      <div style={{ 
        gridColumn: 'span 5',
  
        borderRadius: '12px',
        backgroundColor : '#1E2023',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        border: '1px solid rgba(255, 255, 255, 0.2)',

        flexDirection: 'column'
      }}>
        <LocationsWidget 
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Discovery Widget - Wider */}
      <div style={{ 
        gridColumn: 'span 4',
        backgroundColor: '#1E2023',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255, 255, 255, 0.2)',

      }}>
        <DiscoveryWidget
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Second Row */}
      <div style={{ 
        gridColumn: 'span 4',
        borderRadius: '12px',
        padding: '20px',
        backgroundColor:'#1E2023',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',

      }}>
        <GenderWidget
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      <div style={{ 
        gridColumn: 'span 4',
        backgroundColor: '#1E2023',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255, 255, 255, 0.2)',

      }}>
        <TimeAnalysisWidget
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      <div style={{ 
        gridColumn: 'span 4',
        backgroundColor: '#1E2023',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <BookingTypeWidget
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Third Row */}
      <div style={{ 
        gridColumn: 'span 12',
        backgroundColor: '#131517',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <DailyDistributionWidget
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Fourth Row */}
      <div style={{ 
        gridColumn: 'span 12',
        backgroundColor: '#2e2e2e',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <TimeDistributionWidget
          hospitalId={currentUser.uid}
          doctorId={selectedDoctorId}
          timeRange={selectedTimeRange}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

  {/* Fifth Row */}
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <AgeWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Sixth Row */}
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <PatientLocationWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Seventh Row - Correlations Section */}
  {/* Correlations Board */}
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <CorrelationsBoard
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Gender vs Day */}
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderVsDay
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  {/* Eigth Row - Correlations Section */}
  {/* GendervsBooking Board */}
  {/* <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderVsBooking
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div> */}
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderVsLocation
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <AgeVsGender
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <AgeVsDiscovery
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <LocationVsAge
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#131517',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <LocationVsDiscovery
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#1E2023',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <DiscoveryTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#1E2023',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#1E2023',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <LocationTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: '#1E2023',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <BookingTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{
  gridColumn: 'span 12',
  backgroundColor: '#131517',
  borderRadius: '12px',
  margin: '20px',
  padding: '20px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  maxHeight: 'calc(100vh - 40px)',
  height: 'auto',
  overflowY: 'auto',
  position: 'relative'
}}>
    <Correlation
      hospitalId={currentUser.uid}
    />
  </div>
</div>
</div>

  );
};

export default Home;
