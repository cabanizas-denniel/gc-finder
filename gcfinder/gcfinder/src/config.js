const config = {
    apiUrl: process.env.NODE_ENV === 'production' 
        ? 'https://gc-finder-api.vercel.app'  // Replace with your actual API Vercel URL
        : 'http://localhost:5000'
};

export default config; 