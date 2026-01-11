/**
 * Authentication Manager
 *
 * Handles persistent browser authentication state for Substack and Twitter
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { AuthState, ServiceConfig } from './types.js';

export class AuthManager {
  private authDir: string;

  constructor(authDir?: string) {
    this.authDir = authDir || process.env.AUTH_STATE_DIR || join(process.cwd(), 'auth');
  }

  /**
   * Ensure auth directory exists
   */
  private async ensureAuthDir(): Promise<void> {
    try {
      await access(this.authDir);
    } catch {
      await mkdir(this.authDir, { recursive: true });
    }
  }

  /**
   * Get the path to the auth state file for a service
   */
  private getAuthFilePath(service: 'substack' | 'twitter'): string {
    return join(this.authDir, `${service}.json`);
  }

  /**
   * Save authentication state for a service
   */
  async saveAuthState(service: 'substack' | 'twitter', state: AuthState): Promise<void> {
    await this.ensureAuthDir();
    const filePath = this.getAuthFilePath(service);
    const data = {
      service,
      saved_at: new Date().toISOString(),
      state,
    };
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load authentication state for a service
   */
  async loadAuthState(service: 'substack' | 'twitter'): Promise<AuthState | null> {
    try {
      const filePath = this.getAuthFilePath(service);
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.state;
    } catch (error) {
      // File doesn't exist or couldn't be read
      return null;
    }
  }

  /**
   * Check if authentication state exists for a service
   */
  async hasAuthState(service: 'substack' | 'twitter'): Promise<boolean> {
    try {
      const filePath = this.getAuthFilePath(service);
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete authentication state for a service
   */
  async deleteAuthState(service: 'substack' | 'twitter'): Promise<void> {
    try {
      const filePath = this.getAuthFilePath(service);
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
    } catch {
      // Ignore errors if file doesn't exist
    }
  }

  /**
   * Get service configuration
   */
  getServiceConfig(service: 'substack' | 'twitter'): ServiceConfig {
    const configs: Record<string, ServiceConfig> = {
      substack: {
        service: 'substack',
        auth_required: false, // Optional for public feeds
        login_url: 'https://substack.com/sign-in',
        test_url: 'https://substack.com/profile',
      },
      twitter: {
        service: 'twitter',
        auth_required: true, // Always required
        login_url: 'https://twitter.com/i/flow/login',
        test_url: 'https://twitter.com/home',
      },
    };

    return configs[service];
  }

  /**
   * Test if saved authentication is still valid
   *
   * Note: This is a placeholder. Full implementation with Playwright
   * browser testing will be added when integrating with the command.
   */
  async testAuthentication(service: 'substack' | 'twitter'): Promise<boolean> {
    const hasState = await this.hasAuthState(service);
    if (!hasState) {
      return false;
    }

    // TODO: Actually test authentication by launching browser with saved state
    // and navigating to test_url. For now, just check if state exists.
    return true;
  }

  /**
   * Get authentication info summary
   */
  async getAuthInfo(service: 'substack' | 'twitter'): Promise<any> {
    const hasState = await this.hasAuthState(service);
    const config = this.getServiceConfig(service);

    if (!hasState) {
      return {
        service,
        authenticated: false,
        message: `No saved authentication for ${service}`,
        config,
      };
    }

    try {
      const filePath = this.getAuthFilePath(service);
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      return {
        service,
        authenticated: true,
        saved_at: data.saved_at,
        config,
      };
    } catch (error) {
      return {
        service,
        authenticated: false,
        error: 'Failed to read auth state',
        config,
      };
    }
  }
}
