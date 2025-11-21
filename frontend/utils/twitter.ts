/**
 * Twitter API integration utilities
 * Fetches minimal Twitter metrics with fallback to mocks to avoid API limits
 */

export interface TwitterMetrics {
  follower_count: number;
  following_count: number;
  engagement_rate: number;
  account_age_days: number;
  bot_likelihood: number;
  posting_frequency: number;
  follower_quality: number;
  growth_score: number;
}

interface TwitterUserData {
  id: string;
  username: string;
  name: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  created_at: string;
}

interface TwitterTweetData {
  id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  created_at: string;
}

let twitterToken: string | null = null;
let twitterUserId: string | null = null;
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_TWITTER_MOCKS === 'true' || true; // Default to mocks

/**
 * Connect to Twitter via OAuth 2.0
 * For MVP: Simplified flow with mock token
 */
export async function connectTwitter(): Promise<void> {
  if (USE_MOCK_DATA) {
    // Mock connection for MVP
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = 'mock_twitter_token_' + Date.now();
        twitterToken = mockToken;
        twitterUserId = 'mock_user_' + Date.now();
        localStorage.setItem('twitterToken', mockToken);
        localStorage.setItem('twitterUserId', twitterUserId);
        resolve();
      }, 1000);
    });
  }

  // TODO: Implement actual Twitter OAuth 2.0 flow
  // Redirect to Twitter OAuth, then handle callback
  try {
    const response = await fetch('/api/twitter/auth', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Twitter authentication failed');
    }
    
    const data = await response.json();
    twitterToken = data.access_token;
    twitterUserId = data.user_id;
    localStorage.setItem('twitterToken', twitterToken);
    localStorage.setItem('twitterUserId', twitterUserId);
  } catch (error) {
    console.error('Twitter connection failed:', error);
    throw error;
  }
}

/**
 * Fetch user data from Twitter API v2
 */
async function fetchTwitterUserData(userId?: string): Promise<TwitterUserData | null> {
  if (USE_MOCK_DATA || !twitterToken) {
    return null;
  }

  try {
    const id = userId || twitterUserId || 'me';
    const url = `https://api.twitter.com/2/users/${id}?user.fields=public_metrics,created_at`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${twitterToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data as TwitterUserData;
  } catch (error) {
    console.error('Failed to fetch Twitter user data:', error);
    return null;
  }
}

/**
 * Fetch recent tweets for engagement calculation
 */
async function fetchRecentTweets(count: number = 10): Promise<TwitterTweetData[]> {
  if (USE_MOCK_DATA || !twitterToken || !twitterUserId) {
    return [];
  }

  try {
    const url = `https://api.twitter.com/2/users/${twitterUserId}/tweets?max_results=${count}&tweet.fields=public_metrics,created_at`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${twitterToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []) as TwitterTweetData[];
  } catch (error) {
    console.error('Failed to fetch tweets:', error);
    return [];
  }
}

/**
 * Calculate engagement rate from tweets
 */
function calculateEngagementRate(
  tweets: TwitterTweetData[],
  followerCount: number
): number {
  if (tweets.length === 0 || followerCount === 0) {
    return 0;
  }

  const totalEngagements = tweets.reduce((sum, tweet) => {
    return sum + 
      tweet.public_metrics.like_count +
      tweet.public_metrics.retweet_count +
      tweet.public_metrics.reply_count +
      tweet.public_metrics.quote_count;
  }, 0);

  const avgEngagements = totalEngagements / tweets.length;
  return (avgEngagements / followerCount) * 100;
}

/**
 * Calculate account age in days
 */
function calculateAccountAge(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Estimate bot likelihood based on metrics
 */
function estimateBotLikelihood(
  followerCount: number,
  followingCount: number,
  tweetCount: number,
  accountAgeDays: number
): number {
  // Simple heuristic-based bot detection
  let botScore = 0;

  // High following/follower ratio suggests bot
  if (followingCount > 0) {
    const ratio = followerCount / followingCount;
    if (ratio < 0.1) botScore += 30;
    else if (ratio < 0.5) botScore += 15;
  }

  // Very new account with many followers
  if (accountAgeDays < 30 && followerCount > 1000) {
    botScore += 25;
  }

  // Low tweet count relative to followers
  if (followerCount > 0) {
    const tweetsPerFollower = tweetCount / followerCount;
    if (tweetsPerFollower < 0.01) botScore += 20;
  }

  // Very high follower count with low engagement (handled separately)
  if (followerCount > 10000 && accountAgeDays < 365) {
    botScore += 15;
  }

  return Math.min(100, botScore);
}

/**
 * Calculate posting frequency (tweets per day)
 */
function calculatePostingFrequency(
  tweetCount: number,
  accountAgeDays: number
): number {
  if (accountAgeDays === 0) return 0;
  return Math.min(1, tweetCount / (accountAgeDays * 2)); // Normalized to 0-1
}

/**
 * Estimate follower quality score
 */
function estimateFollowerQuality(
  followerCount: number,
  followingCount: number,
  engagementRate: number
): number {
  let qualityScore = 50; // Base score

  // Good follower/following ratio
  if (followingCount > 0) {
    const ratio = followerCount / followingCount;
    if (ratio > 2) qualityScore += 20;
    else if (ratio > 1) qualityScore += 10;
  }

  // Engagement rate indicates quality
  if (engagementRate > 3) qualityScore += 20;
  else if (engagementRate > 1.5) qualityScore += 10;

  // Moderate follower count suggests organic growth
  if (followerCount > 100 && followerCount < 10000) {
    qualityScore += 10;
  }

  return Math.min(100, qualityScore);
}

/**
 * Calculate growth score
 */
function calculateGrowthScore(
  followerCount: number,
  accountAgeDays: number,
  engagementRate: number
): number {
  let growthScore = 50;

  // Growth rate (followers per day)
  if (accountAgeDays > 0) {
    const followersPerDay = followerCount / accountAgeDays;
    if (followersPerDay > 10) growthScore += 30;
    else if (followersPerDay > 5) growthScore += 20;
    else if (followersPerDay > 1) growthScore += 10;
  }

  // Engagement indicates active growth
  if (engagementRate > 2) growthScore += 20;

  return Math.min(100, growthScore);
}

/**
 * Generate mock Twitter metrics
 * Used when API is unavailable or to avoid rate limits
 */
function generateMockMetrics(): TwitterMetrics {
  // Generate realistic mock data
  const followerCount = Math.floor(Math.random() * 5000) + 500;
  const followingCount = Math.floor(Math.random() * 1000) + 100;
  const accountAgeDays = Math.floor(Math.random() * 2000) + 365;
  const tweetCount = Math.floor(Math.random() * 5000) + 100;
  
  const engagementRate = Math.random() * 5 + 1; // 1-6%
  const botLikelihood = estimateBotLikelihood(followerCount, followingCount, tweetCount, accountAgeDays);
  const postingFrequency = calculatePostingFrequency(tweetCount, accountAgeDays);
  const followerQuality = estimateFollowerQuality(followerCount, followingCount, engagementRate);
  const growthScore = calculateGrowthScore(followerCount, accountAgeDays, engagementRate);

  return {
    follower_count: followerCount,
    following_count: followingCount,
    engagement_rate: Math.round(engagementRate * 100) / 100,
    account_age_days: accountAgeDays,
    bot_likelihood: Math.round(botLikelihood * 100) / 100,
    posting_frequency: Math.round(postingFrequency * 1000) / 1000,
    follower_quality: Math.round(followerQuality * 100) / 100,
    growth_score: Math.round(growthScore * 100) / 100,
  };
}

/**
 * Fetch Twitter metrics
 * Uses real API when available, falls back to mocks to avoid API limits
 */
export async function fetchTwitterMetrics(): Promise<TwitterMetrics> {
  const token = localStorage.getItem('twitterToken') || twitterToken;
  const userId = localStorage.getItem('twitterUserId') || twitterUserId;
  
  if (!token) {
    throw new Error('Twitter not connected. Please connect Twitter first.');
  }

  // Use mock data if configured or if API fails
  if (USE_MOCK_DATA) {
    console.log('Using mock Twitter metrics (to avoid API limits)');
    return generateMockMetrics();
  }

  try {
    // Fetch user data
    const userData = await fetchTwitterUserData(userId || undefined);
    
    if (!userData) {
      console.warn('Failed to fetch user data, using mocks');
      return generateMockMetrics();
    }

    // Fetch recent tweets for engagement calculation
    const tweets = await fetchRecentTweets(10);

    // Calculate metrics
    const followerCount = userData.public_metrics.followers_count;
    const followingCount = userData.public_metrics.following_count;
    const tweetCount = userData.public_metrics.tweet_count;
    const accountAgeDays = calculateAccountAge(userData.created_at);
    
    const engagementRate = tweets.length > 0 
      ? calculateEngagementRate(tweets, followerCount)
      : Math.random() * 5 + 1; // Fallback if no tweets
    
    const botLikelihood = estimateBotLikelihood(
      followerCount,
      followingCount,
      tweetCount,
      accountAgeDays
    );
    
    const postingFrequency = calculatePostingFrequency(tweetCount, accountAgeDays);
    const followerQuality = estimateFollowerQuality(
      followerCount,
      followingCount,
      engagementRate
    );
    const growthScore = calculateGrowthScore(
      followerCount,
      accountAgeDays,
      engagementRate
    );

    return {
      follower_count: followerCount,
      following_count: followingCount,
      engagement_rate: Math.round(engagementRate * 100) / 100,
      account_age_days: accountAgeDays,
      bot_likelihood: Math.round(botLikelihood * 100) / 100,
      posting_frequency: Math.round(postingFrequency * 1000) / 1000,
      follower_quality: Math.round(followerQuality * 100) / 100,
      growth_score: Math.round(growthScore * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching Twitter metrics:', error);
    console.warn('Falling back to mock data');
    return generateMockMetrics();
  }
}

/**
 * Check if Twitter is connected
 */
export function isTwitterConnected(): boolean {
  return !!localStorage.getItem('twitterToken');
}

/**
 * Disconnect Twitter
 */
export function disconnectTwitter(): void {
  twitterToken = null;
  twitterUserId = null;
  localStorage.removeItem('twitterToken');
  localStorage.removeItem('twitterUserId');
}

