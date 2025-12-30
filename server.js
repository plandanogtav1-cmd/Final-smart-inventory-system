const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Email server is running',
    timestamp: new Date().toISOString()
  });
});

// Send email endpoint
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    const mailOptions = {
      from: `"Smart Inventory System" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Test email endpoint
app.post('/test-email', async (req, res) => {
  try {
    const testEmail = {
      from: `"Smart Inventory System" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send test email to yourself
      subject: 'Email Server Test',
      html: '<h1>Email server is working!</h1><p>This is a test email from your Smart Inventory System.</p>'
    };

    const info = await transporter.sendMail(testEmail);
    
    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Test email sent successfully'
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});