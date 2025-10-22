import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

const LandingPage = () => {
  const [backendMessage, setBackendMessage] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/test');
        setBackendMessage(response.data.message);
      } catch (error) {
        console.error('Error connecting to backend:', error);
        setBackendMessage('Backend not connected');
      }
    };
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-6">RGUKT Coding Platform</h1>
        <p className="text-3xl mb-12">Solve problems, learn coding, compete with others.</p>
        {/* <p className="mb-4">Backend Status: {backendMessage}</p> */}
        <Link to="/login" className="bg-white text-blue-900 px-8 py-4 rounded text-xl hover:bg-gray-100 transition-colors">Get Started</Link>
      </div>
    </div>
  );
};

export default LandingPage;