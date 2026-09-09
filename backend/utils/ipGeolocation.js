import axios from 'axios';

export const getIpGeolocation = async (ip) => {
  try {
    // Using ip-api.com (free, no API key required)
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
    
    if (response.data.status === 'success') {
      return {
        countryCode: response.data.countryCode,
        countryName: response.data.country,
      };
    }
    
    // Fallback if service fails
    return {
      countryCode: null,
      countryName: null,
    };
  } catch (error) {
    console.error('IP geolocation error:', error);
    return {
      countryCode: null,
      countryName: null,
    };
  }
};

export const getClientIp = (req) => {
  // Check various headers for IP (considering proxies)
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

