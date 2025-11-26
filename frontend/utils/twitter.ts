/**
 * Twitter API integration utilities
 * Currently using mock data - OAuth integration removed for development
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

/**
 * Connect to Twitter - DISABLED (using mock data)
 * OAuth integration removed - will be restored when project is complete
 */
export async function connectTwitter(): Promise<void> {
  // OAuth removed - using mock data instead
  console.log('Twitter OAuth disabled - using mock data');
  return Promise.resolve();
}

/**
 * Fetch user data from Twitter API v2 using Privy access token
 */
async function fetchTwitterUserData(
  accessToken: string,
  userId?: string
): Promise<TwitterUserData | null> {
  try {
    const id = userId || 'me';
    const url = `https://api.twitter.com/2/users/${id}?user.fields=public_metrics,created_at`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', response.status, errorText);
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
async function fetchRecentTweets(
  accessToken: string,
  userId: string,
  count: number = 10
): Promise<TwitterTweetData[]> {
  try {
    const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=${count}&tweet.fields=public_metrics,created_at`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', response.status, errorText);
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
 * Fetch Twitter metrics using Privy access token
 * This fetches REAL data from Twitter API - no mocks!
 */
export async function fetchTwitterMetrics(
  accessToken: string,
  userId: string
): Promise<TwitterMetrics> {
  if (!accessToken || !userId) {
    throw new Error('Twitter not connected. Please connect Twitter first.');
  }

  try {
    console.log('🔍 Fetching REAL Twitter metrics from API...');
    
    // Fetch user data
    const userData = await fetchTwitterUserData(accessToken, userId);
    
    if (!userData) {
      throw new Error('Failed to fetch Twitter user data');
    }

    console.log('✅ User data fetched:', {
      username: userData.username,
      followers: userData.public_metrics.followers_count,
    });

    // Fetch recent tweets for engagement calculation
    const tweets = await fetchRecentTweets(accessToken, userId, 10);
    console.log(`✅ Fetched ${tweets.length} recent tweets`);

    // Calculate metrics
    const followerCount = userData.public_metrics.followers_count;
    const followingCount = userData.public_metrics.following_count;
    const tweetCount = userData.public_metrics.tweet_count;
    const accountAgeDays = calculateAccountAge(userData.created_at);
    
    const engagementRate = tweets.length > 0 
      ? calculateEngagementRate(tweets, followerCount)
      : 0; // No fallback - use real data or 0
    
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

    const metrics = {
      follower_count: followerCount,
      following_count: followingCount,
      engagement_rate: Math.round(engagementRate * 100) / 100,
      account_age_days: accountAgeDays,
      bot_likelihood: Math.round(botLikelihood * 100) / 100,
      posting_frequency: Math.round(postingFrequency * 1000) / 1000,
      follower_quality: Math.round(followerQuality * 100) / 100,
      growth_score: Math.round(growthScore * 100) / 100,
    };

    console.log('✅ Real Twitter metrics calculated:', metrics);
    return metrics;
  } catch (error) {
    console.error('❌ Error fetching Twitter metrics:', error);
    throw error;
  }
}

/**
 * Check if Twitter is connected via Privy
 */
export function isTwitterConnected(user: any): boolean {
  return user?.twitter !== undefined && user?.twitter !== null;
}

/**
 * Get Twitter access token from Privy user
 * Privy stores OAuth tokens in linkedAccounts when "Return OAuth tokens" is enabled
 */
export function getTwitterAccessToken(user: any): string | null {
  if (!user) return null;
  
  // Check linkedAccounts array
  if (user.linkedAccounts && Array.isArray(user.linkedAccounts)) {
    const twitterAccount = user.linkedAccounts.find(
      (account: any) => account.type === 'twitter' || account.provider === 'twitter'
    );
    
    // Try different possible property names
    return twitterAccount?.oauthAccessToken || 
           twitterAccount?.accessToken || 
           twitterAccount?.token ||
           null;
  }
  
  // Fallback: check if Twitter is directly on user object
  if (user.twitter) {
    return user.twitter.oauthAccessToken || 
           user.twitter.accessToken || 
           null;
  }
  
  return null;
}

/**
 * Get Twitter user ID from Privy user
 */
export function getTwitterUserId(user: any): string | null {
  if (!user) return null;
  
  // Check linkedAccounts array
  if (user.linkedAccounts && Array.isArray(user.linkedAccounts)) {
    const twitterAccount = user.linkedAccounts.find(
      (account: any) => account.type === 'twitter' || account.provider === 'twitter'
    );
    
    return twitterAccount?.subject || 
           twitterAccount?.userId || 
           twitterAccount?.id ||
           null;
  }
  
  // Fallback: check if Twitter is directly on user object
  if (user.twitter) {
    return user.twitter.subject || 
           user.twitter.userId || 
           user.twitter.id ||
           null;
  }
  
  return null;
}

/**
 * Get Twitter username from Privy user
 */
export function getTwitterUsername(user: any): string | null {
  if (user?.linkedAccounts) {
    const twitterAccount = user.linkedAccounts.find(
      (account: any) => account.type === 'twitter'
    );
    return twitterAccount?.username || null;
  }
  return null;
}

/**
 * Generate mock Twitter metrics for development
 * Use this when Twitter OAuth is not configured yet
 */
export function generateMockTwitterMetrics(): TwitterMetrics {
  // Generate realistic-looking mock data
  const followerCount = Math.floor(Math.random() * 50000) + 1000; // 1k-51k followers
  const followingCount = Math.floor(followerCount * (0.3 + Math.random() * 0.4)); // 30-70% of followers
  const accountAgeDays = Math.floor(Math.random() * 2000) + 100; // 100-2100 days old
  const tweetCount = Math.floor(accountAgeDays * (0.5 + Math.random() * 2)); // Variable posting frequency
  
  // Calculate realistic engagement rate (0.5% - 5%)
  const engagementRate = 0.5 + Math.random() * 4.5;
  
  // Calculate bot likelihood based on metrics
  const followingRatio = followerCount / (followingCount || 1);
  let botLikelihood = 0;
  if (followingRatio < 0.1) botLikelihood = 30;
  else if (followingRatio < 0.5) botLikelihood = 15;
  if (accountAgeDays < 30 && followerCount > 1000) botLikelihood += 25;
  
  const postingFrequency = Math.min(1, tweetCount / (accountAgeDays * 2));
  const followerQuality = followingRatio > 2 ? 70 : followingRatio > 1 ? 60 : 50;
  const growthScore = followerCount / accountAgeDays > 10 ? 80 : followerCount / accountAgeDays > 5 ? 70 : 60;
  
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

