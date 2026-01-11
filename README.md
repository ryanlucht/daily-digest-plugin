# Daily Digest Plugin for Claude Code

AI-powered daily digest that curates and ranks articles from your Substack feeds and Twitter/X lists based on your interests.

## Features

- 🤖 **AI-Powered Ranking**: Claude holistically evaluates each article based on your interest profile
- 📰 **Multi-Source**: Aggregates content from Substack feeds and Twitter/X lists
- 🔐 **Persistent Authentication**: Login once, authenticated sessions persist across runs
- 📅 **Daily Automation**: Schedule with cron for automatic daily digests
- 📝 **Markdown Output**: Clean, readable digest files with top 5 articles

## Installation

### Option 1: Clone from GitHub

```bash
cd ~/.claude/plugins
git clone https://github.com/ryanlucht/daily-digest-plugin.git
```

### Option 2: Manual Setup

1. Clone this repository to `~/.claude/plugins/daily-digest-plugin`
2. Install MCP server dependencies:
   ```bash
   cd ~/.claude/plugins/daily-digest-plugin/servers/feed-scraper
   npm install
   npm run build
   ```
3. Restart Claude Code to load the plugin

## Quick Start

### 1. Configure Your Interest Profile

Edit `config/interest-profile.yaml` with your topics, questions, and focus areas:

```yaml
profile:
  name: "My Tech Digest"

topics:
  - name: "AI/ML Infrastructure"
    weight: 10
    keywords: ["LLM", "training", "inference", "GPU"]

questions:
  - "How are companies solving LLM reliability in production?"

areas_of_focus:
  - "Claude Code extensibility"
  - "MCP protocol developments"
```

### 2. Configure Your Sources

Edit `config/sources.yaml` with your Substack feeds and Twitter lists:

```yaml
sources:
  substack:
    - url: "https://example.substack.com/feed"
      name: "Example Newsletter"
      requires_auth: false

  twitter:
    - url: "https://twitter.com/i/lists/123456789"
      name: "Tech Leaders"
      requires_auth: true
```

### 3. Run Your First Digest

```bash
claude /daily-digest
```

On first run with authenticated sources:
- A browser window will open for login
- Complete authentication manually
- Session state is saved for future runs

### 4. Schedule Daily Runs

Add to crontab (`crontab -e`):

```bash
# Run daily at 8 AM
0 8 * * * ~/.claude/plugins/daily-digest-plugin/run-digest.sh
```

## Usage

### Basic Usage

```bash
claude /daily-digest
```

### Flags

- `--test`: Dry-run mode (doesn't save digest)
- `--reauth`: Force re-authentication for all sources

### Examples

```bash
# Generate digest normally
claude /daily-digest

# Test configuration without saving
claude /daily-digest --test

# Re-authenticate with Twitter/Substack
claude /daily-digest --reauth
```

## Output

Digests are saved to `digests/digest-YYYY-MM-DD.md`:

```markdown
# Daily Digest - January 11, 2026

## 🥇 #1: Building Production LLM Systems
**Author**: Jane Smith | **Source**: Substack | **Score**: 9.5/10

**Why it matters**: Directly addresses your question about LLM reliability in production with novel approaches.

**Summary**: A deep dive into fault-tolerant inference architectures...
```

## Architecture

```
daily-digest-plugin/
├── commands/
│   └── daily-digest.md          # Main command
├── servers/
│   └── feed-scraper/            # MCP server for feed fetching
├── config/
│   ├── interest-profile.yaml    # Your interest profile
│   └── sources.yaml             # Feed URLs
├── digests/                     # Generated digests
├── auth/                        # Stored authentication (gitignored)
└── logs/                        # Execution logs
```

## Cost Estimates

- **API calls**: ~50 articles/day × $0.001 (Haiku) = **$1.50/month**
- **Storage**: <10MB (auth states and digests)
- **Compute**: Negligible (~2-5 minutes per day)

## Troubleshooting

### Authentication Issues

**Problem**: "Authentication failed" or "Login required"

**Solution**:
```bash
# Force re-authentication
claude /daily-digest --reauth
```

### No Articles Found

**Problem**: Digest shows 0 articles

**Solution**:
- Check `sources.yaml` URLs are correct
- Verify feeds have content from last 24 hours
- Check logs in `logs/` directory

### Cron Not Running

**Problem**: Scheduled digest doesn't run

**Solution**:
- Verify cron job: `crontab -l`
- Check logs: `tail -f ~/.claude/plugins/daily-digest-plugin/logs/*.log`
- Ensure system is powered on at scheduled time

## Development

### Build MCP Server

```bash
cd servers/feed-scraper
npm run build
```

### Run Tests

```bash
npm test
```

### Local Development

```bash
# Watch mode
npm run dev
```

## Contributing

Contributions welcome! Please open issues or pull requests.

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions:
- GitHub Issues: https://github.com/ryanlucht/daily-digest-plugin/issues
- Documentation: See `docs/` directory
