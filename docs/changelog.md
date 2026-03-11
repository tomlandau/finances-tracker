# Changelog

## [Unreleased]

### Added
- **Auto-Classification Alerts & Logging**: Telegram digest sent to Tom after each classifier run listing all auto-classified transactions (amount, date, category, rule pattern, ⚠️ for payment apps). Added `ClassificationTrail` to track every classification layer with timing. Added `formatAutoClassificationDigest()` to `telegram/messages.ts`. Worker errors in digest sending are isolated and do not crash the run. (+15 tests, 115 total)
