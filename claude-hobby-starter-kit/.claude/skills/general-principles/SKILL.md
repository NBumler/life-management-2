---
name: general-principles
description: >
  Core development principles for this hobby project, applied to any language
  or framework. Use when making architectural or design decisions, choosing
  between approaches, reviewing whether something is over-engineered, or when
  asked "should I add X". Hungarian triggers: "túltervezés", "megéri-e",
  "hogyan csináljam", "melyik megoldás", "architektúra döntés". Covers KISS,
  YAGNI, simplicity-over-DRY, and when to stop abstracting. Do NOT use for
  language-specific rules → use spring-boot-conventions or
  ionic-angular-conventions.
---

# General Development Principles

## Overview

The foundation the language-specific skills build on. This is a hobby project,
so the bias is strongly toward simplicity and shipping over ceremony.

## The principles

- **KISS — Keep It Simple.** The simplest solution that fully solves the current
  problem wins. Clever is a cost, not a virtue.
- **YAGNI — You Aren't Gonna Need It.** Don't build for hypothetical futures.
  No config flags, plugin systems, or extra layers "just in case". Add them when
  a real, present need forces the issue.
- **Simplicity over DRY.** When removing duplication makes the code harder to
  follow, keep the duplication. A little copy-paste is cheaper than the wrong
  abstraction. Rule of three: abstract only after the third real repetition.
- **Prefer boring.** Use the framework's standard way before reaching for a
  library or a custom mechanism.
- **Make it work, then make it clean.** Get a working slice first; refactor with
  tests as backup.

## Decision checklist

Before adding structure (a new layer, interface, library, abstraction), ask:

1. Does a concrete, *current* requirement need this? (Not "might later.")
2. Is there a simpler thing the framework already gives me?
3. Will this make the code easier to read for future-me in 6 months?

If any answer is "no", don't add it yet.

## Smells to push back on

- An interface with exactly one implementation and no test seam that needs it.
- A factory/builder for an object with two fields.
- Configuration for something that never changes.
- Generalizing before the second real use case exists.
