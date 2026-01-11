/**
 * Substack feed scraper
 */

import { XMLParser } from 'fast-xml-parser';
import { Article, FeedResult } from './types.js';

export class SubstackScraper {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Fetch articles from a Substack RSS feed
   */
  async fetchFeed(
    url: string,
    hours: number = 24,
    useAuth: boolean = false
  ): Promise<FeedResult> {
    const startTime = new Date();
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      // Fetch the RSS feed
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
      }

      const xmlData = await response.text();
      const parsed = this.parser.parse(xmlData);

      // Extract articles from RSS feed
      const articles = this.parseRSSFeed(parsed, cutoffTime);

      return {
        articles,
        fetched_at: startTime,
        source_url: url,
      };
    } catch (error) {
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
   * Parse RSS/Atom feed data into Article objects
   */
  private parseRSSFeed(parsed: any, cutoffTime: Date): Article[] {
    const articles: Article[] = [];

    try {
      // Handle RSS 2.0 format
      if (parsed.rss?.channel?.item) {
        const items = Array.isArray(parsed.rss.channel.item)
          ? parsed.rss.channel.item
          : [parsed.rss.channel.item];

        for (const item of items) {
          const article = this.parseRSSItem(item, cutoffTime);
          if (article) {
            articles.push(article);
          }
        }
      }
      // Handle Atom format
      else if (parsed.feed?.entry) {
        const entries = Array.isArray(parsed.feed.entry)
          ? parsed.feed.entry
          : [parsed.feed.entry];

        for (const entry of entries) {
          const article = this.parseAtomEntry(entry, cutoffTime);
          if (article) {
            articles.push(article);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
    }

    return articles;
  }

  /**
   * Parse a single RSS item
   */
  private parseRSSItem(item: any, cutoffTime: Date): Article | null {
    try {
      // Parse publication date
      const pubDate = new Date(item.pubDate || item.published);

      // Filter out articles older than cutoff
      if (pubDate < cutoffTime) {
        return null;
      }

      // Extract author (try multiple fields)
      const author =
        item['dc:creator'] ||
        item.creator ||
        item.author?.name ||
        item.author ||
        'Unknown';

      // Extract summary/description
      const summary = this.extractTextContent(
        item.description ||
        item.summary ||
        item.content ||
        item['content:encoded'] ||
        ''
      );

      // Extract full text if available
      const fullText = item['content:encoded']
        ? this.extractTextContent(item['content:encoded'])
        : undefined;

      return {
        title: item.title || 'Untitled',
        url: item.link || item.guid || '',
        author: String(author),
        date: pubDate,
        summary: this.truncate(summary, 500),
        source: 'substack',
        full_text: fullText ? this.truncate(fullText, 5000) : undefined,
      };
    } catch (error) {
      console.error('Error parsing RSS item:', error);
      return null;
    }
  }

  /**
   * Parse a single Atom entry
   */
  private parseAtomEntry(entry: any, cutoffTime: Date): Article | null {
    try {
      // Parse publication date
      const pubDate = new Date(entry.published || entry.updated);

      // Filter out articles older than cutoff
      if (pubDate < cutoffTime) {
        return null;
      }

      // Extract author
      const author = entry.author?.name || entry.author || 'Unknown';

      // Extract link
      let link = entry.link;
      if (Array.isArray(link)) {
        link = link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href'] || link[0]?.['@_href'];
      } else if (typeof link === 'object') {
        link = link['@_href'];
      }

      // Extract summary
      const summary = this.extractTextContent(
        entry.summary || entry.content?.['#text'] || entry.content || ''
      );

      return {
        title: entry.title || 'Untitled',
        url: link || entry.id || '',
        author: String(author),
        date: pubDate,
        summary: this.truncate(summary, 500),
        source: 'substack',
      };
    } catch (error) {
      console.error('Error parsing Atom entry:', error);
      return null;
    }
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextContent(html: string): string {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Truncate text to a maximum length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
