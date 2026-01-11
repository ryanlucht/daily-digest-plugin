/**
 * Substack "For You" feed scraper using Playwright
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Article, FeedResult, AuthState } from './types.js';

export class SubstackScraper {
  /**
   * Fetch articles from Substack "For You" feed
   * @param url - Substack feed URL (https://substack.com/home)
   * @param postsToScrape - Number of posts to load
   * @param authState - Saved authentication state
   */
  async fetchFeed(
    url: string,
    postsToScrape: number = 40,
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

      // Navigate to Substack home feed
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for feed to load
      await page.waitForTimeout(2000);

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

      // Scroll and collect posts
      const articles = await this.scrollAndCollectPosts(page, postsToScrape);

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
      // Look for common logged-in indicators
      // Adjust selectors based on actual Substack HTML structure
      const profileButton = await page.$('button[aria-label*="profile"], a[href*="/profile"]');
      return profileButton !== null;
    } catch {
      return false;
    }
  }

  /**
   * Scroll through feed and collect posts
   */
  private async scrollAndCollectPosts(
    page: Page,
    targetCount: number
  ): Promise<Article[]> {
    const articles: Article[] = [];
    const seenUrls = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Prevent infinite loops

    while (articles.length < targetCount && scrollAttempts < maxScrollAttempts) {
      // Extract posts from current viewport
      const newPosts = await this.extractPostsFromPage(page);

      // Add unique posts
      for (const post of newPosts) {
        if (!seenUrls.has(post.url) && articles.length < targetCount) {
          seenUrls.add(post.url);
          articles.push(post);
        }
      }

      // Scroll down to load more
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1000); // Wait for content to load

      scrollAttempts++;

      // Break if we haven't found new posts in several attempts
      if (articles.length === seenUrls.size && scrollAttempts > 5) {
        break;
      }
    }

    return articles.slice(0, targetCount);
  }

  /**
   * Extract posts from current page state
   */
  private async extractPostsFromPage(page: Page): Promise<Article[]> {
    try {
      // Extract post data using page.evaluate
      // NOTE: Selectors need to be updated based on actual Substack DOM structure
      const posts = await page.evaluate(() => {
        const postElements = document.querySelectorAll('article, [data-testid="post"], .post-preview');
        const extracted: any[] = [];

        postElements.forEach((el) => {
          try {
            // Extract title
            const titleEl = el.querySelector('h2, h3, .post-title, [data-testid="post-title"]');
            const title = titleEl?.textContent?.trim() || 'Untitled';

            // Extract URL
            const linkEl = el.querySelector('a[href*="substack.com"]');
            const url = linkEl?.getAttribute('href') || '';

            // Extract author
            const authorEl = el.querySelector('.author, [data-testid="author"], .byline');
            const author = authorEl?.textContent?.trim() || 'Unknown';

            // Extract excerpt/summary
            const excerptEl = el.querySelector('p, .excerpt, .post-preview-description');
            const excerpt = excerptEl?.textContent?.trim() || '';

            // Extract date (if available)
            const dateEl = el.querySelector('time, .date, [data-testid="post-date"]');
            const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent || '';

            if (url && title) {
              extracted.push({
                title,
                url,
                author,
                summary: excerpt.substring(0, 500),
                dateStr,
              });
            }
          } catch (err) {
            // Skip malformed posts
          }
        });

        return extracted;
      });

      // Convert to Article objects
      return posts.map((post: any) => ({
        title: post.title,
        url: post.url,
        author: post.author,
        date: post.dateStr ? new Date(post.dateStr) : new Date(),
        summary: post.summary,
        source: 'substack' as const,
      }));
    } catch (error) {
      console.error('Error extracting posts:', error);
      return [];
    }
  }

  /**
   * Perform login flow for Substack
   * This opens a visible browser for manual login
   */
  async performLogin(): Promise<AuthState> {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to login page
    await page.goto('https://substack.com/sign-in');

    console.log('Please log in to Substack in the browser window...');
    console.log('Waiting for login to complete (will detect when redirected to home page)...');

    // Wait for successful login (redirected to home or profile)
    await page.waitForURL('**/home**', { timeout: 300000 }); // 5 minute timeout

    console.log('Login successful! Saving authentication state...');

    // Save auth state
    const state = await context.storageState();

    await browser.close();

    return state as AuthState;
  }
}
