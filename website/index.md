---
layout: home

hero:
  name: "Electro"
  text: "TypeScript framework for Electron apps"
  tagline: "Modules. Typed IPC. Dependency injection. Built for desktop."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/aspect-build/electro

features:
  - title: Module System
    details: Organize your app into modules with explicit boundaries, imports, exports, and lifecycle hooks.
    icon:
      src: /icons/modules.svg
  - title: Typed Bridge
    details: Auto-generated typed IPC between main and renderer. Queries, commands, and signals — all type-safe.
    icon:
      src: /icons/bridge.svg
  - title: Dependency Injection
    details: Synchronous inject() with hierarchical scoping. No constructors, no service locator.
    icon:
      src: /icons/di.svg
  - title: Lifecycle-Aware
    details: onInit, onReady, onShutdown, onDispose — predictable resource management across your entire app.
    icon:
      src: /icons/lifecycle.svg
  - title: Window & View System
    details: Declarative window management with per-view access control and source binding.
    icon:
      src: /icons/windows.svg
  - title: Code Generation
    details: Bridge types, preload scripts, and registry metadata — generated from your source code.
    icon:
      src: /icons/codegen.svg
---
