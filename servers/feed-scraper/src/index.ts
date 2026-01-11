#!/usr/bin/env node

/**
 * Feed Scraper MCP Server
 *
 * Provides tools for fetching content from Substack feeds and Twitter lists,
 * with support for persistent authentication.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SubstackScraper } from './substack.js';
import { TwitterScraper } from './twitter.js';
import { AuthManager } from './auth-manager.js';

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'fetch_substack_feed',
    description: 'Fetch articles from Substack "For You" feed using browser automation',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the Substack feed (default: https://substack.com/home)',
          default: 'https://substack.com/home',
        },
        posts_to_scrape: {
          type: 'number',
          description: 'Number of posts to scrape from the feed',
          default: 40,
        },
        use_auth: {
          type: 'boolean',
          description: 'Whether to use saved authentication state',
          default: true,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'fetch_twitter_timeline',
    description: 'Fetch tweets from Twitter timeline using browser automation',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the Twitter timeline (default: https://twitter.com/home)',
          default: 'https://twitter.com/home',
        },
        posts_to_scrape: {
          type: 'number',
          description: 'Number of tweets to scrape from timeline',
          default: 100,
        },
        use_auth: {
          type: 'boolean',
          description: 'Whether to use saved authentication state',
          default: true,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'save_auth_state',
    description: 'Save browser authentication state for a service',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['substack', 'twitter'],
          description: 'Service to save authentication for',
        },
        state: {
          type: 'object',
          description: 'Browser storage state from Playwright',
        },
      },
      required: ['service', 'state'],
    },
  },
  {
    name: 'load_auth_state',
    description: 'Load saved authentication state for a service',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['substack', 'twitter'],
          description: 'Service to load authentication for',
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'test_authentication',
    description: 'Test if saved authentication is still valid',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['substack', 'twitter'],
          description: 'Service to test authentication for',
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'perform_login',
    description: 'Perform interactive login for a service (opens browser window)',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['substack', 'twitter'],
          description: 'Service to log in to',
        },
      },
      required: ['service'],
    },
  },
];

/**
 * Main server class
 */
class FeedScraperServer {
  private server: Server;
  private substackScraper: SubstackScraper;
  private twitterScraper: TwitterScraper;
  private authManager: AuthManager;

  constructor() {
    this.server = new Server(
      {
        name: 'feed-scraper',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.substackScraper = new SubstackScraper();
    this.twitterScraper = new TwitterScraper();
    this.authManager = new AuthManager();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fetch_substack_feed':
            return await this.handleFetchSubstackFeed(args);

          case 'fetch_twitter_timeline':
            return await this.handleFetchTwitterTimeline(args);

          case 'save_auth_state':
            return await this.handleSaveAuthState(args);

          case 'load_auth_state':
            return await this.handleLoadAuthState(args);

          case 'test_authentication':
            return await this.handleTestAuthentication(args);

          case 'perform_login':
            return await this.handlePerformLogin(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleFetchSubstackFeed(args: any) {
    const { url = 'https://substack.com/home', posts_to_scrape = 40, use_auth = true } = args;

    // Load auth state if requested
    let authState = null;
    if (use_auth) {
      authState = await this.authManager.loadAuthState('substack');
      if (!authState) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'No saved authentication for Substack. Please use perform_login tool first.',
              }, null, 2),
            },
          ],
        };
      }
    }

    const result = await this.substackScraper.fetchFeed(url, posts_to_scrape, authState);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleFetchTwitterTimeline(args: any) {
    const { url = 'https://twitter.com/home', posts_to_scrape = 100, use_auth = true } = args;

    // Load auth state if requested
    let authState = null;
    if (use_auth) {
      authState = await this.authManager.loadAuthState('twitter');
      if (!authState) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'No saved authentication for Twitter. Please use perform_login tool first.',
              }, null, 2),
            },
          ],
        };
      }
    }

    const result = await this.twitterScraper.fetchList(url, posts_to_scrape, authState);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleSaveAuthState(args: any) {
    const { service, state } = args;

    if (!service || !state) {
      throw new Error('service and state parameters are required');
    }

    if (service !== 'substack' && service !== 'twitter') {
      throw new Error('service must be "substack" or "twitter"');
    }

    await this.authManager.saveAuthState(service, state);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Authentication state saved for ${service}`,
            service,
          }, null, 2),
        },
      ],
    };
  }

  private async handleLoadAuthState(args: any) {
    const { service } = args;

    if (!service) {
      throw new Error('service parameter is required');
    }

    if (service !== 'substack' && service !== 'twitter') {
      throw new Error('service must be "substack" or "twitter"');
    }

    const authInfo = await this.authManager.getAuthInfo(service);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(authInfo, null, 2),
        },
      ],
    };
  }

  private async handleTestAuthentication(args: any) {
    const { service } = args;

    if (!service) {
      throw new Error('service parameter is required');
    }

    if (service !== 'substack' && service !== 'twitter') {
      throw new Error('service must be "substack" or "twitter"');
    }

    const isValid = await this.authManager.testAuthentication(service);
    const authInfo = await this.authManager.getAuthInfo(service);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            service,
            is_valid: isValid,
            ...authInfo,
          }, null, 2),
        },
      ],
    };
  }

  private async handlePerformLogin(args: any) {
    const { service } = args;

    if (!service) {
      throw new Error('service parameter is required');
    }

    if (service !== 'substack' && service !== 'twitter') {
      throw new Error('service must be "substack" or "twitter"');
    }

    try {
      let authState;

      if (service === 'substack') {
        authState = await this.substackScraper.performLogin();
      } else {
        authState = await this.twitterScraper.performLogin();
      }

      // Save the auth state
      await this.authManager.saveAuthState(service, authState);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Successfully logged in to ${service} and saved authentication state`,
              service,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: errorMessage,
              service,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Feed Scraper MCP Server running on stdio');
  }
}

// Start the server
const server = new FeedScraperServer();
server.run().catch(console.error);
