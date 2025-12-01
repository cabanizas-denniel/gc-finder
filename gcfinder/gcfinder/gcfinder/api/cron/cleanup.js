/**
 * Vercel Cron Job: Auto-cleanup old items and lost requests
 * 
 * This serverless function is triggered daily by Vercel's cron scheduler.
 * It calls the Flask backend's cleanup endpoint to:
 * 1. Archive items older than 15 days (unclaimed, pending, claimed, disapproved)
 * 2. Delete lost requests older than 15 days
 * 
 * Schedule: Runs daily at 2:00 AM UTC (configured in vercel.json)
 */

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = req.headers['authorization'];
  
  // For cron jobs, Vercel sends a special header
  // You can also add your own secret for extra security
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow the request if it's from Vercel's cron or has the correct secret
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const hasValidSecret = req.query.secret === cronSecret;
  const isForced = req.query.force === 'true';
  
  // In development or if no secret is set, allow the request
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && cronSecret && !isVercelCron && !hasValidSecret && !isForced) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get the Flask backend URL from environment variables
    const backendUrl = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendUrl) {
      console.error('Backend URL not configured');
      return res.status(500).json({ 
        error: 'Backend URL not configured',
        hint: 'Set REACT_APP_API_URL in Vercel environment variables'
      });
    }

    console.log(`[Cron] Triggering cleanup at ${new Date().toISOString()}`);
    
    // Call the Flask backend cleanup endpoint
    const response = await fetch(`${backendUrl}/api/cron/cleanup-items?force=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass the cron secret to the backend if configured
        ...(cronSecret && { 'X-Cron-Secret': cronSecret })
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Cron] Cleanup failed:', data);
      return res.status(response.status).json({
        success: false,
        error: data.error || 'Cleanup failed',
        timestamp: new Date().toISOString()
      });
    }

    console.log('[Cron] Cleanup completed successfully:', data.results);
    
    return res.status(200).json({
      success: true,
      message: 'Cleanup completed successfully',
      results: data.results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Cron] Error during cleanup:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Vercel configuration for the API route
export const config = {
  maxDuration: 60 // Allow up to 60 seconds for cleanup (Vercel Pro) or 10s (free tier)
};

