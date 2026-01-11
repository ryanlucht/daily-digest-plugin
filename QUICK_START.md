# Quick Start After Restart

## 1️⃣ Exit Current Session
```bash
exit
```

## 2️⃣ Restart Claude Code
```bash
claude
```

## 3️⃣ Resume Conversation
```bash
/resume
```

## 4️⃣ Start Testing
Say: **"Let's continue with Phase 4.5 testing. Start with authentication."**

---

## What Claude Will Do

1. ✅ Verify MCP tools are loaded
2. 🔐 Authenticate you with Substack (browser will open)
3. 🔐 Authenticate you with Twitter (browser will open)
4. 🧪 Test scraping with 5 Substack posts
5. 🧪 Test scraping with 10 Twitter posts
6. 🐛 Debug and fix any issues with DOM selectors

---

## Expected Issues

**DOM selectors will likely fail** - this is normal! Claude will:
- Enable headless:false to watch browser
- Inspect actual HTML structure
- Update selectors in code
- Rebuild and retest

---

**See HANDOFF.md for full details**
