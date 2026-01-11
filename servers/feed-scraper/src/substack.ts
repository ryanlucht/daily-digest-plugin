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
      await page.waitForTimeout(3000);

      console.log('[DEBUG] Page loaded, URL:', page.url());

      // Scroll and collect posts
      console.log('[DEBUG] Starting to collect posts, target:', postsToScrape);
      const articles = await this.scrollAndCollectPosts(page, postsToScrape);
      console.log('[DEBUG] Collected articles:', articles.length);

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
    const maxScrollAttempts = 200; // Increased to handle many Notes/non-articles
    let consecutiveEmptyScrolls = 0;
    const maxConsecutiveEmpty = 10; // Stop after 10 scrolls with no new articles

    console.log(`[DEBUG] Starting to collect ${targetCount} articles...`);

    while (articles.length < targetCount && scrollAttempts < maxScrollAttempts) {
      const previousCount = articles.length;

      // Extract posts from current viewport
      const newPosts = await this.extractPostsFromPage(page);

      // Add unique posts
      let addedThisScroll = 0;
      for (const post of newPosts) {
        if (!seenUrls.has(post.url) && articles.length < targetCount) {
          seenUrls.add(post.url);
          articles.push(post);
          addedThisScroll++;
        }
      }

      console.log(`[DEBUG] Scroll ${scrollAttempts + 1}: Found ${newPosts.length} posts, added ${addedThisScroll} new articles (total: ${articles.length}/${targetCount})`);

      // Track consecutive failures
      if (articles.length === previousCount) {
        consecutiveEmptyScrolls++;
        console.log(`[DEBUG] No new articles found (${consecutiveEmptyScrolls}/${maxConsecutiveEmpty} empty scrolls)`);

        if (consecutiveEmptyScrolls >= maxConsecutiveEmpty) {
          console.log(`[DEBUG] Stopping: ${maxConsecutiveEmpty} consecutive scrolls with no new articles`);
          break;
        }
      } else {
        consecutiveEmptyScrolls = 0; // Reset on success
      }

      // Scroll down to load more
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
      await page.waitForTimeout(1500); // Increased wait time for content to load

      scrollAttempts++;
    }

    console.log(`[DEBUG] Collection complete: ${articles.length} articles after ${scrollAttempts} scrolls`);
    return articles.slice(0, targetCount);
  }

  /**
   * Extract posts from current page state
   */
  private async extractPostsFromPage(page: Page): Promise<Article[]> {
    try {
      // Extract post data using page.evaluate
      // Using selectors discovered from actual Substack DOM
      const posts = await page.evaluate(() => {
        // Find all feed items by looking for the feedItem class pattern
        const feedItems = document.querySelectorAll('[class*="feedItem"]');
        const extracted: any[] = [];

        feedItems.forEach((el) => {
          try {
            // Find the post link (links to *.substack.com/p/*)
            const linkEl = el.querySelector('a[href*=".substack.com/p/"]');
            if (!linkEl) return;

            const url = linkEl.getAttribute('href') || '';

            // The link text often contains "AuthorNameTitle" - try to find separate elements
            // Look for the author badge
            const authorBadge = el.querySelector('[data-testid="user-badge"]');
            const author = authorBadge?.textContent?.trim() || 'Unknown';

            // Find title - usually in a larger text element near the link
            // Try multiple approaches
            let title = '';

            // Approach 1: Look for a heading-like element
            const headingEl = el.querySelector('h1, h2, h3, [class*="Title"], [class*="title"]');
            if (headingEl) {
              title = headingEl.textContent?.trim() || '';
            }

            // Approach 2: If no heading, get text from the link but remove author name
            if (!title) {
              const linkText = linkEl.textContent?.trim() || '';
              // Try to remove author name from beginning
              if (author && linkText.startsWith(author)) {
                title = linkText.substring(author.length).trim();
              } else {
                title = linkText;
              }
            }

            // Find excerpt/summary - look for paragraph text
            const excerptEl = el.querySelector('p, [class*="preview"], [class*="excerpt"], [class*="description"]');
            let excerpt = excerptEl?.textContent?.trim() || '';

            // Clean up excerpt - remove if it's just the title repeated
            if (excerpt === title) excerpt = '';

            // Find date
            const timeEl = el.querySelector('time');
            const dateStr = timeEl?.getAttribute('datetime') || timeEl?.textContent || '';

            if (url && title) {
              extracted.push({
                title: title.substring(0, 200),
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
