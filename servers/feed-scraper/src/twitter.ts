/**
 * Twitter/X timeline scraper using Playwright
 */

import { chromium, Browser, Page } from 'playwright';
import { Article, FeedResult, AuthState } from './types.js';

export class TwitterScraper {
  /**
   * Fetch tweets from Twitter timeline
   * @param url - Twitter URL (https://twitter.com/home)
   * @param postsToScrape - Number of tweets to load
   * @param authState - Saved authentication state
   */
  async fetchList(
    url: string,
    postsToScrape: number = 100,
    authState?: AuthState | null
  ): Promise<FeedResult> {
    const startTime = new Date();
    let browser: Browser | null = null;

    try {
      // Launch browser
      browser = await chromium.launch({ headless: true });

      // Create context with auth state if available
      const context = authState
        ? await browser.newContext({ storageState: authState as any })
        : await browser.newContext();

      const page = await context.newPage();

      // Navigate to Twitter home
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for timeline to load
      await page.waitForTimeout(3000);

      // Check if we're logged in
      const isLoggedIn = await this.checkIfLoggedIn(page);
      if (!isLoggedIn) {
        await browser.close();
        return {
          articles: [],
          fetched_at: startTime,
          source_url: url,
          error: 'Not authenticated. Please run with --reauth flag to log in.',
        };
      }

      // Scroll and collect tweets
      const articles = await this.scrollAndCollectTweets(page, postsToScrape);

      await browser.close();

      return {
        articles,
        fetched_at: startTime,
        source_url: url,
      };
    } catch (error) {
      if (browser) await browser.close();
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        articles: [],
        fetched_at: startTime,
        source_url: url,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if user is logged in
   */
  private async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      // Look for timeline or compose tweet button
      const timeline = await page.$('[data-testid="primaryColumn"]');
      return timeline !== null;
    } catch {
      return false;
    }
  }

  /**
   * Scroll through timeline and collect tweets
   */
  private async scrollAndCollectTweets(
    page: Page,
    targetCount: number
  ): Promise<Article[]> {
    const articles: Article[] = [];
    const seenUrls = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 100; // More attempts for longer timelines

    while (articles.length < targetCount && scrollAttempts < maxScrollAttempts) {
      // Extract tweets from current viewport
      const newTweets = await this.extractTweetsFromPage(page);

      // Add unique tweets
      for (const tweet of newTweets) {
        if (!seenUrls.has(tweet.url) && articles.length < targetCount) {
          seenUrls.add(tweet.url);
          articles.push(tweet);
        }
      }

      // Scroll down to load more
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
      await page.waitForTimeout(800); // Wait for content to load

      scrollAttempts++;

      // Break if we haven't found new tweets in several attempts
      if (articles.length > 0 && scrollAttempts % 10 === 0) {
        const currentSize = articles.length;
        if (currentSize === seenUrls.size) {
          break; // No new content loading
        }
      }
    }

    return articles.slice(0, targetCount);
  }

  /**
   * Extract tweets from current page state
   */
  private async extractTweetsFromPage(page: Page): Promise<Article[]> {
    try {
      // Extract tweet data using page.evaluate
      const tweets = await page.evaluate(() => {
        const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
        const extracted: any[] = [];

        tweetElements.forEach((el) => {
          try {
            // Extract tweet text
            const textEl = el.querySelector('[data-testid="tweetText"]');
            const text = textEl?.textContent?.trim() || '';

            // Extract author
            const authorEl = el.querySelector('[data-testid="User-Name"]');
            const author = authorEl?.textContent?.trim()?.split('@')[0]?.trim() || 'Unknown';

            // Extract URL (from tweet link)
            const linkEl = el.querySelector('a[href*="/status/"]');
            const href = linkEl?.getAttribute('href') || '';
            const url = href ? `https://twitter.com${href}` : '';

            // Extract time
            const timeEl = el.querySelector('time');
            const dateStr = timeEl?.getAttribute('datetime') || '';

            if (url && text) {
              extracted.push({
                text,
                url,
                author,
                dateStr,
              });
            }
          } catch (err) {
            // Skip malformed tweets
          }
        });

        return extracted;
      });

      // Convert to Article objects
      return tweets.map((tweet: any) => ({
        title: tweet.text.substring(0, 100), // Use first 100 chars as title
        url: tweet.url,
        author: tweet.author,
        date: tweet.dateStr ? new Date(tweet.dateStr) : new Date(),
        summary: tweet.text,
        source: 'twitter' as const,
      }));
    } catch (error) {
      console.error('Error extracting tweets:', error);
      return [];
    }
  }

  /**
   * Perform login flow for Twitter
   * This opens a visible browser for manual login
   */
  async performLogin(): Promise<AuthState> {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to login page
    await page.goto('https://twitter.com/i/flow/login');

    console.log('Please log in to Twitter in the browser window...');
    console.log('Waiting for login to complete (will detect when redirected to home)...');

    // Wait for successful login (redirected to home timeline)
    await page.waitForURL('**/home**', { timeout: 300000 }); // 5 minute timeout

    console.log('Login successful! Saving authentication state...');

    // Save auth state
    const state = await context.storageState();

    await browser.close();

    return state as AuthState;
  }
}
