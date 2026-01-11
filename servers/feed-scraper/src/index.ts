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

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'fetch_substack_feed',
    description: 'Fetch articles from a Substack RSS feed',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the Substack RSS feed',
        },
        use_auth: {
          type: 'boolean',
          description: 'Whether to use saved authentication state',
          default: false,
        },
        hours: {
          type: 'number',
          description: 'Only fetch articles from the last N hours',
          default: 24,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'fetch_twitter_list',
    description: 'Fetch tweets from a Twitter/X list',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the Twitter list',
        },
        use_auth: {
          type: 'boolean',
          description: 'Whether to use saved authentication state',
          default: true,
        },
        hours: {
          type: 'number',
          description: 'Only fetch tweets from the last N hours',
          default: 24,
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
];

/**
 * Main server class
 */
class FeedScraperServer {
  private server: Server;

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

          case 'fetch_twitter_list':
            return await this.handleFetchTwitterList(args);

          case 'save_auth_state':
            return await this.handleSaveAuthState(args);

          case 'load_auth_state':
            return await this.handleLoadAuthState(args);

          case 'test_authentication':
            return await this.handleTestAuthentication(args);

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
    // TODO: Implement Substack feed fetching
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'not_implemented',
            message: 'Substack feed fetching will be implemented in Phase 2',
            args,
          }, null, 2),
        },
      ],
    };
  }

  private async handleFetchTwitterList(args: any) {
    // TODO: Implement Twitter list fetching
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'not_implemented',
            message: 'Twitter list fetching will be implemented in Phase 2',
            args,
          }, null, 2),
        },
      ],
    };
  }

  private async handleSaveAuthState(args: any) {
    // TODO: Implement auth state saving
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'not_implemented',
            message: 'Auth state saving will be implemented in Phase 3',
            args,
          }, null, 2),
        },
      ],
    };
  }

  private async handleLoadAuthState(args: any) {
    // TODO: Implement auth state loading
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'not_implemented',
            message: 'Auth state loading will be implemented in Phase 3',
            args,
          }, null, 2),
        },
      ],
    };
  }

  private async handleTestAuthentication(args: any) {
    // TODO: Implement auth testing
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'not_implemented',
            message: 'Auth testing will be implemented in Phase 3',
            args,
          }, null, 2),
        },
      ],
    };
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
