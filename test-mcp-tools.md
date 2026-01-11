# MCP Tools Testing Guide

This document tracks testing of the feed-scraper MCP server tools.

## Prerequisites

1. **MCP Server Built**: `cd servers/feed-scraper && npm run build`
2. **Plugin Registered**: Claude Code should recognize the plugin at `~/.claude/plugins/daily-digest-plugin`
3. **Playwright Installed**: Playwright browsers should be available

## Test 1: Verify MCP Server Registration

**Goal**: Confirm Claude Code can see the feed-scraper MCP tools

**How**: Check if tools appear in Claude Code:
- `load_auth_state`
- `test_authentication`
- `perform_login`
- `fetch_substack_feed`
- `fetch_twitter_timeline`

**Status**: ⏳ PENDING

---

## Test 2: Authentication - Substack

**Goal**: Authenticate with Substack and save auth state

**Steps**:
1. Call `perform_login` tool with `service: "substack"`
2. Browser window should open to https://substack.com/sign-in
3. Manually log in with your credentials
4. Wait for redirect to /home
5. Tool should save auth state to `auth/substack.json`

**Expected Output**:
```json
{
  "success": true,
  "message": "Successfully logged in to substack and saved authentication state",
  "service": "substack"
}
```

**Status**: ⏳ PENDING

**Notes**:
- [ ] Check if `auth/substack.json` file was created
- [ ] Verify file contains cookies and origins

---

## Test 3: Authentication - Twitter

**Goal**: Authenticate with Twitter and save auth state

**Steps**:
1. Call `perform_login` tool with `service: "twitter"`
2. Browser window should open to https://twitter.com/i/flow/login
3. Manually log in with your credentials
4. Wait for redirect to /home
5. Tool should save auth state to `auth/twitter.json`

**Expected Output**:
```json
{
  "success": true,
  "message": "Successfully logged in to twitter and saved authentication state",
  "service": "twitter"
}
```

**Status**: ⏳ PENDING

**Notes**:
- [ ] Check if `auth/twitter.json` file was created
- [ ] Verify file contains cookies and origins

---

## Test 4: Verify Authentication Persistence

**Goal**: Confirm saved auth can be loaded

**Steps**:
1. Call `load_auth_state` with `service: "substack"`
2. Call `load_auth_state` with `service: "twitter"`

**Expected Output**: Auth info with `authenticated: true` and `saved_at` timestamp

**Status**: ⏳ PENDING

---

## Test 5: Scrape Substack Feed

**Goal**: Verify Substack scraper works with real feed

**Steps**:
1. Call `fetch_substack_feed` with:
   - `url: "https://substack.com/home"`
   - `posts_to_scrape: 5` (small number for testing)
   - `use_auth: true`

**Expected Output**:
```json
{
  "articles": [
    {
      "title": "Article Title",
      "url": "https://...",
      "author": "Author Name",
      "date": "2026-01-11T...",
      "summary": "Article excerpt...",
      "source": "substack"
    }
    // ... 4 more
  ],
  "fetched_at": "2026-01-11T...",
  "source_url": "https://substack.com/home"
}
```

**Status**: ⏳ PENDING

**Potential Issues**:
- [ ] DOM selectors may be wrong (Substack HTML structure unknown)
- [ ] Authentication may fail (need to inspect)
- [ ] Scrolling may not work properly

**Debug Steps if Failing**:
1. Enable headless: false in substack.ts to watch browser
2. Add console.error() to log extracted elements
3. Take screenshot of page to inspect HTML
4. Use browser devtools to find correct selectors

---

## Test 6: Scrape Twitter Timeline

**Goal**: Verify Twitter scraper works with real timeline

**Steps**:
1. Call `fetch_twitter_timeline` with:
   - `url: "https://twitter.com/home"`
   - `posts_to_scrape: 10` (small number for testing)
   - `use_auth: true`

**Expected Output**:
```json
{
  "articles": [
    {
      "title": "Tweet text preview...",
      "url": "https://twitter.com/user/status/123...",
      "author": "Username",
      "date": "2026-01-11T...",
      "summary": "Full tweet text...",
      "source": "twitter"
    }
    // ... 9 more
  ],
  "fetched_at": "2026-01-11T...",
  "source_url": "https://twitter.com/home"
}
```

**Status**: ⏳ PENDING

**Potential Issues**:
- [ ] DOM selectors may be wrong
- [ ] Rate limiting by Twitter
- [ ] Login detection failing

**Debug Steps if Failing**:
1. Enable headless: false to watch browser
2. Check if `[data-testid="tweet"]` selector exists
3. Verify timeline loads before scraping starts
4. Check for rate limit errors

---

## Known Issues to Fix

### Issue 1: DOM Selectors are Guesses

**Problem**: I wrote DOM selectors based on typical patterns, but haven't seen the actual HTML

**Impact**: HIGH - Scraping will likely fail on first attempt

**Fix**:
1. Run scrapers with headless: false
2. Use browser devtools to inspect actual HTML
3. Update selectors in substack.ts and twitter.ts

### Issue 2: No Error Handling for Network Issues

**Problem**: Network timeouts or failures may not be handled gracefully

**Impact**: MEDIUM

**Fix**: Add try/catch and retry logic

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. MCP Server Registration | ⏳ | |
| 2. Substack Auth | ⏳ | |
| 3. Twitter Auth | ⏳ | |
| 4. Auth Persistence | ⏳ | |
| 5. Substack Scraping | ⏳ | |
| 6. Twitter Scraping | ⏳ | |

---

## Next Steps After Testing

1. ✅ Fix any DOM selector issues found
2. ✅ Improve error messages
3. ✅ Add retry logic for network failures
4. ✅ Document actual behavior vs expected
5. → Proceed to Phase 5 (AI Ranking) once all tests pass
