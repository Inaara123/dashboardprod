
// src/Components/AIBot.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { auth } from '../firebase';
import { sendMessage } from '../services/api';

// import { sqlAgent } from '../services/sqlAgent';

const AIBot = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [administratorName, setAdministratorName] = useState('');
//   const [agentInitialized, setAgentInitialized] = useState(false);
  const chatContainerRef = useRef(null);
  
  useEffect(() => {
    const fetchData = async () => {
        try {
            const { data: subscriptionData, error: subscriptionError } = await supabase
                .from('subscriptions')
                .select('plan_name')
                .eq('hospital_id', auth.currentUser.uid)
                .single();

            if (subscriptionError) throw subscriptionError;
            setPlan(subscriptionData.plan_name);

            const { data: adminData, error: adminError } = await supabase
                .from('hospitals')
                .select('administrator')
                .eq('hospital_id', auth.currentUser.uid)
                .single();

            if (adminError) throw adminError;
            setAdministratorName(adminData.administrator);
        } catch (error) {
            console.error('Error fetching data:', error);
            setMessages(prev => [...prev, {
                text: "Failed to load user data. Please refresh the page or contact support.",
                sender: 'ai',
                timestamp: new Date().toISOString(),
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, []);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  // const fetchAdministratorName = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('hospitals')
  //       .select('administrator')
  //       .eq('hospital_id', auth.currentUser.uid)
  //       .single();

  //     if (error) throw error;
  //     setAdministratorName(data.administrator);
  //   } catch (error) {
  //     console.error('Error fetching administrator name:', error);
  //   }
  // };

  // const fetchSubscription = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('subscriptions')
  //       .select('plan_name')
  //       .eq('hospital_id', auth.currentUser.uid)
  //       .single();

  //     if (error) throw error;
  //     setPlan(data.plan_name);
  //   } catch (error) {
  //     console.error('Error fetching subscription:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleUpgrade = (amount) => {
    // Implement payment gateway integration here
    console.log(`Processing upgrade payment of ₹${amount}`);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
        text: inputMessage,
        sender: 'user',
        timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    const thinkingMessage = {
        text: "Thinking...",
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isLoading: true
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
        // Only this part changes - using the new API endpoint
        const result = await sendMessage(inputMessage, auth.currentUser.uid);
        
        setMessages(prev => [
            ...prev.slice(0, -1), // Remove thinking message
            {
                text: result.response,  // FastAPI returns {response: "answer"}
                sender: 'ai',
                timestamp: new Date().toISOString()
            }
        ]);
    } catch (error) {
        console.error('Error processing message:', error);
        setMessages(prev => [
            ...prev.slice(0, -1), // Remove thinking message
            {
                text: "I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.",
                sender: 'ai',
                timestamp: new Date().toISOString(),
                isError: true
            }
        ]);
    }
};




  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #2193b0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (plan === 'Essential') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h2 style={{
            background: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px'
          }}>Upgrade to Pro</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Unlock advanced AI features and analytics with our Pro plan
          </p>
          <button
            onClick={() => handleUpgrade(12999)}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              boxShadow: '0 4px 15px rgba(33,147,176,0.2)'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Upgrade to Pro - ₹12,999
          </button>
        </div>
      </div>
    );
  }

  if (plan === 'Advanced') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h2 style={{
            background: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px'
          }}>Upgrade to Pro</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Take your experience to the next level with our Pro plan
          </p>
          <button
            onClick={() => handleUpgrade(5999)}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              boxShadow: '0 4px 15px rgba(33,147,176,0.2)'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Upgrade to Pro - ₹5,999
          </button>
        </div>
      </div>
    );
  }

  // Pro Plan Chat Interface
  return (
    <div style={{
      height: '100vh',
      background: '#1E2023',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        backgroundColor: '#1E2023',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          background: '#1E2023',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>
            Hello {administratorName}, I am Aida
          </h2>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Ask me anything about your medical practice data</p>
        </div>
        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
            background: '#1E2023'
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '20px'
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '15px 20px',
                borderRadius: message.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                background: message.sender === 'user' 
                  ? '#7667B0'
                  : 'white',
                color: message.sender === 'user' ? 'white' : '#333',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                {message.text}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <form 
          onSubmit={handleSendMessage}
          style={{
            padding: '20px',
            borderTop: '1px solid #eee',
            background: '#1E2023'
          }}
        >
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your question here..."
              style={{
                flex: 1,
                padding: '15px',
                border: '1px solid #e1e1e1',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => e.target.style.borderColor = '#2193b0'}
              onBlur={(e) => e.target.style.borderColor = '#e1e1e1'}
            />
            <button
              type="submit"
              style={{
                padding: '15px 30px',
                background: '#7667B0',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                fontWeight: '600'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIBot;