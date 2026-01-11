/**
 * Type definitions for feed scraper
 */

export interface Article {
  title: string;
  url: string;
  author: string;
  date: Date;
  summary: string;
  source: 'substack';
  full_text?: string;
}

export interface FeedResult {
  articles: Article[];
  fetched_at: Date;
  source_url: string;
  error?: string;
}

export interface AuthState {
  cookies: any[];
  origins: any[];
}

export interface ServiceConfig {
  service: 'substack';
  auth_required: boolean;
  login_url?: string;
  test_url?: string;
}
