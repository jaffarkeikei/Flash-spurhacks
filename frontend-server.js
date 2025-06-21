const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3001; // Using different port to avoid conflicts

// Ensure photos directory exists
const photosDir = path.join(__dirname, 'public', 'assets', 'photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, photosDir);
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `user_photo_${timestamp}.jpg`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('File filter check:', file);
    // Accept any file for now to debug
    cb(null, true);
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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

// Photo upload endpoint
app.post('/api/v1/photos/upload', upload.single('photo'), (req, res) => {
  console.log('Photo upload request received');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  
  try {
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({
        success: false,
        error: 'No photo file provided'
      });
    }

    console.log('File uploaded successfully:', req.file);
    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        filename: req.file.filename,
        path: `/assets/photos/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photo'
    });
  }
});

// Handle multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed!'
    });
  }
  next(error);
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