import { useState } from 'react';
import useAuthStore from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore(); // for mock, just login
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password); // mock
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-orange-50 p-12 rounded shadow-md max-w-md w-full border border-orange-200 hover:shadow-lg transition-all duration-300">
        <h2 className="text-2xl mb-4">Signup</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 mb-4 border" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 mb-4 border" required />
        <button type="submit" className="w-full bg-blue-500 text-white p-2">Signup</button>
      </form>
    </div>
  );
};

export default Signup;