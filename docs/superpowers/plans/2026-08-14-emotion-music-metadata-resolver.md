# Emotion Music Metadata Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve public NetEase and QQ Music song metadata from safe links while preserving the existing offline share-text fallback.

**Architecture:** A small server-side resolver exposes one POST endpoint and dispatches validated canonical song identifiers to replaceable provider adapters. Vite mounts the same handler locally and `api/music/resolve.mjs` exports it for serverless deployment; the React picker consumes a normalized client contract.

**Tech Stack:** React 18, TypeScript, Vite middleware, Node-compatible serverless JavaScript, Vitest.

---

### Task 1: Resolver contract and security core

**Files:**
- Create: `server/music/security.mjs`
- Create: `server/music/resolver.mjs`
- Test: `server/music/resolver.test.mjs`

- [ ] Write failing tests for provider allowlists, unsafe ports/credentials/hosts, fixed upstream endpoints, redirects, timeout, body limit and normalized errors.
- [ ] Run `npm test -- server/music/resolver.test.mjs` and verify failure because the resolver does not exist.
- [ ] Implement the minimum validator, bounded fetcher and adapter dispatcher.
- [ ] Re-run the resolver tests and commit the security core.

### Task 2: Provider adapters and HTTP entrypoint

**Files:**
- Create: `server/music/providers/netease.mjs`
- Create: `server/music/providers/qq.mjs`
- Create: `server/music/http.mjs`
- Create: `api/music/resolve.mjs`
- Modify: `vite.config.ts`
- Test: `server/music/providers.test.mjs`
- Test: `server/music/http.test.mjs`

- [ ] Write failing fixture-based tests for NetEase and QQ metadata mapping, rate limiting and response contract.
- [ ] Run the focused tests and verify expected failures.
- [ ] Implement adapters, shared handler, Vite middleware and serverless export without secrets or audio handling.
- [ ] Re-run focused tests and commit the server/API slice.

### Task 3: Frontend state and offline fallback

**Files:**
- Create: `src/emotion/emotionMusicResolverClient.ts`
- Modify: `src/emotion/components/EmotionMusicPicker.tsx`
- Modify: `src/emotion/components/EmotionMusicPicker.test.tsx`
- Modify: `src/emotion/types.ts`
- Modify: `src/emotion/emotionStorage.ts`
- Modify: `src/emotion/emotionEnhancements.css`

- [ ] Write failing tests for loading, remote success, failure reason, only-save-link fallback and existing share-text fallback.
- [ ] Run focused component and storage tests and verify expected failures.
- [ ] Implement the client contract, asynchronous UI states, optional cover persistence and accessible feedback.
- [ ] Re-run focused tests and commit the frontend slice.

### Task 4: Verification and deployment documentation

**Files:**
- Create: `docs/情绪模块/13-音乐解析服务部署与验证-v1.4.md`

- [ ] Run fixture security tests, emotion tests, repository-wide tests and production build.
- [ ] Start the local preview, validate the supplied NetEase link and one QQ link, and verify safe failure without console errors.
- [ ] Record commands, results, deployment behavior and known limitations.
- [ ] Compare final Git status against baseline, stage only listed files, and create the final independent commit.

