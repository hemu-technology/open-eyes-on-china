#!/usr/bin/env bash
# Fetch all comments from Remark42 using public APIs (no admin needed)
# - Lists all posts with comments
# - Fetches comments per post
# - Outputs a combined JSON Lines file (one post per line with its comments)
#
# Requirements: curl, jq
# Usage:
#   ./fetch_all_comments.sh > all_comments.jsonl
#   # or specify SITE and HOST
#   SITE=open-eyes-on-china HOST=https://comments.openeyesonchina.com ./fetch_all_comments.sh > all_comments.jsonl

set -euo pipefail

SITE="${SITE:-open-eyes-on-china}"
HOST="${HOST:-https://comments.openeyesonchina.com}"
LIMIT="${LIMIT:-1000}"

# Get list of posts that have comments
posts_json=$(curl -fsSL "${HOST}/api/v1/list?site=${SITE}&limit=${LIMIT}")

# Iterate posts and fetch comments for each
echo "$posts_json" | jq -r '.[].url' | while IFS= read -r post_url; do
  # Fetch comments tree for this post; use plain text to simplify downstream processing
  comments=$(curl -fsSL --get \
    --data-urlencode "site=${SITE}" \
    --data-urlencode "url=${post_url}" \
    --data-urlencode "format=plain" \
    "${HOST}/api/v1/find")

  # Emit one JSON object per line: { post, count, comments }
  jq -n --arg post "$post_url" --argjson comments "$comments" '{post: $post, count: ($comments | length), comments: $comments}'
done
