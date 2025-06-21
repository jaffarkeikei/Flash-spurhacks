const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001; // Using different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock API endpoints for frontend development
app.post('/api/v1/auth/login', (req, res) => {
  // Mock login response
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: 'demo-user-123',
        email: 'demo@flashsettle.com',
        name: 'Demo User'
      },
      accessToken: 'mock-jwt-token-12345',
      refreshToken: 'mock-refresh-token-67890'
    }
  });
});

app.post('/api/v1/payments/send', (req, res) => {
  // Mock payment response
  const mockTransactionHash = '0x' + Math.random().toString(16).substr(2, 64);
  
  res.json({
    success: true,
    message: 'Payment processed successfully',
    data: {
      paymentId: 'pay_' + Math.random().toString(36).substr(2, 9),
      transactionHash: mockTransactionHash,
      status: 'completed',
      amount: req.body.amount,
      fee: req.body.fee,
      recipient: req.body.recipient,
      timestamp: new Date().toISOString(),
      estimatedTime: '< 1 second'
    }
  });
});

app.get('/api/v1/rates/convert', (req, res) => {
  // Mock exchange rate response
  const { from, to, amount } = req.query;
  const mockRates = {
    'USD-EUR': 0.85,
    'USD-GBP': 0.73,
    'USD-USDC': 1.0,
    'EUR-USD': 1.18,
    'EUR-GBP': 0.86,
    'EUR-USDC': 1.18,
    'GBP-USD': 1.37,
    'GBP-EUR': 1.16,
    'GBP-USDC': 1.37
  };
  
  const rateKey = `${from}-${to}`;
  const rate = mockRates[rateKey] || 1.0;
  const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
  
  res.json({
    success: true,
    data: {
      from,
      to,
      amount: parseFloat(amount),
      convertedAmount: parseFloat(convertedAmount),
      rate,
      timestamp: new Date().toISOString()
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Frontend server running (no database required)'
  });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`🔌 Mock API endpoints available at: http://localhost:${PORT}/api/v1/`);
  console.log(`💡 No database required - all data is mocked for frontend development`);
}); 