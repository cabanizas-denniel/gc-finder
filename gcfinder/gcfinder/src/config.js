const config = {
    apiUrl: process.env.NODE_ENV === 'production' 
        ? process.env.REACT_APP_API_URL || 'https://your-api-project.vercel.app'  // Replace with your actual API Vercel URL
        : 'http://localhost:5000'
};

export default config; 