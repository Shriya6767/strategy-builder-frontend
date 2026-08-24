const LOG_LEVELS = {
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE',
  CONTEXT: 'CONTEXT',
  WARNING: 'WARNING'
};

const logger = {
  error: (message, data = null) => {
    console.error(`[ERROR] ${message}`, data ? data : '');
  },

  success: (message, data = null) => {
    console.log(`[SUCCESS] ${message}`, data ? data : '');
  },

  warning: (message, data = null) => {
    console.warn(`[WARNING] ${message}`, data ? data : '');
  },

  request: (endpoint, requestDetails) => {
    console.log(`API REQUEST: ${endpoint}`);
    console.log(`${requestDetails.method || 'GET'} ${requestDetails.url || ''}`);
    
    if (requestDetails.parameters) {
      console.log('Query Parameters:', JSON.stringify(requestDetails.parameters, null, 2));
    }
    
    if (requestDetails.body) {
      console.log('Request Body:', JSON.stringify(requestDetails.body, null, 2));
    }
  },

  response: (endpoint, responseDetails) => {
    const status = responseDetails.status || 200;
    console.log(`API RESPONSE: ${endpoint}`);
    console.log(`Status: ${status}`);
    
    if (responseDetails.data) {
      console.log('Response Body:', JSON.stringify(responseDetails.data, null, 2));
    }
  },

  context: (action, data) => {
    console.log(`[CONTEXT] ${action}`, data);
  }
};

export default logger;
