import React, { useState } from 'react';
import { Loader2, User, Lock, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { setAuthToken } from '../services/api'; 

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_BASE_URL = '/api/auth';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const endpoint = isLoginMode ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLoginMode) {
          setAuthToken(data.token);
          onLoginSuccess();
        } else {
          setSuccessMessage(data.message || 'Registration successful! Please log in.');
          setIsLoginMode(true); // Switch to login mode after successful registration
          setUsername(''); // Clear username/password for new login
          setPassword('');
        }
      } else {
        setError(data.message || `An error occurred (${response.status}).`);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError('Network error or server unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
    setSuccessMessage(null);
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-800 to-slate-900 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-full inline-flex items-center justify-center mb-4 shadow-md">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a OSINT Brief
          </h2>
          <p className="text-gray-600">
            {isLoginMode ? 'Inicia sesión para continuar' : 'Crea una cuenta nueva'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4 rounded flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                placeholder="Tu nombre de usuario"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                placeholder="Tu contraseña secreta"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginMode ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
            {isLoginMode ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          {isLoginMode ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          <button
            type="button"
            onClick={handleSwitchMode}
            className="text-indigo-600 hover:text-indigo-800 font-medium ml-1"
          >
            {isLoginMode ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};