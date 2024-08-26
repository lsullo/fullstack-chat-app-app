import express from 'express';
import AWS from 'aws-sdk';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting server...');

// Enable CORS
app.use(cors());

// Configure AWS SDK
AWS.config.update({ region: 'us-east-2' });

const cognito = new AWS.CognitoIdentityServiceProvider();

// Endpoint to search users
app.get('/api/search-users', async (req, res) => {
  console.log('Received request to search users');
  const query = req.query.query;

  const params = {
    UserPoolId: 'us-east-2_cUasGwZ8Z',
    Filter: `username ^= "${query}"`,
    Limit: 10,
  };

  try {
    const response = await cognito.listUsers(params).promise();
    const users = response.Users.map(user => user.Username);
    console.log('Search results:', users);
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Error searching users' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
