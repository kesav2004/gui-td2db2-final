
import React, { useState } from 'react';
import {
  Form,
  TextInput,
  Button,
  InlineNotification,
  Grid,
  Column,
} from '@carbon/react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Simple validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    // In a real application, this would authenticate against a backend
    // For demo purposes, we'll just accept any login
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f4f4f4',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="https://www.ibm.com/in-en"
            alt="IBM Logo"
            style={{ height: '40px', marginBottom: '1rem' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/320px-IBM_logo.svg.png";
            }}
          />
          <h1 className="cds--productive-heading-05">IBM Migration Dashboard</h1>
          <p className="cds--body-short-01" style={{ color: '#525252', marginTop: '0.5rem' }}>
            Log in to access the migration tools
          </p>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Error:"
            subtitle={error}
            hideCloseButton
            style={{ marginBottom: '1rem' }}
          />
        )}

        <Form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <TextInput
              id="username"
              labelText="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <TextInput
              id="password"
              labelText="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            kind="primary"
            style={{ width: '100%' }}
          >
            Sign In
          </Button>

          <div style={{ 
            marginTop: '1rem', 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '14px'
          }}>
            <a href="#forgot-password" className="cds--link">Forgot password?</a>
            <a href="#create-account" className="cds--link">Create account</a>
          </div>
        </Form>

        <p style={{ 
          textAlign: 'center', 
          marginTop: '2rem', 
          fontSize: '12px',
          color: '#525252'
        }}>
          © 2025 IBM Corporation. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
