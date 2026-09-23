# Contributing to Monitor Controller

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Git
- Platform-specific requirements:
  - **Windows**: Visual Studio 2022 with "Desktop development with C++" workload
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential`, `libsecret-1-dev`

### Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/monitor-controller.git
cd monitor-controller

# Install dependencies
npm ci

# Verify setup
npm run typecheck
npm run lint

# Start development
npm run start
```

## 🔄 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `chore/description` - Maintenance tasks

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

Examples:
```
feat(monitor): add support for VCP code 0x60 (input source)
fix(windows): resolve WMI enumeration for multi-monitor setups
docs(readme): update Linux installation instructions
```

## 🎨 Code Style

### TypeScript

- Strict mode enabled
- Explicit return types for public functions
- Use `interface` over `type` for object shapes
- Prefer `const` over `let`
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### React

- Functional components with hooks
- Component names in PascalCase
- Props interface named `ComponentNameProps`
- Use `React.FC` for type inference
- Memoize callbacks with `useCallback`

### CSS

- CSS Custom Properties for theming
- BEM-inspired naming: `.block__element--modifier`
- Mobile-first responsive design
- Respect `prefers-reduced-motion`

### Linting & Formatting

```bash
# Check linting
npm run lint

# Check types
npm run typecheck
```

## 🧪 Testing

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] App launches without errors
- [ ] Monitors detected on your platform
- [ ] Sliders update values in real-time
- [ ] Presets apply correctly
- [ ] Reset to defaults works
- [ ] Keyboard navigation works (Tab, Arrow keys, Home/End)
- [ ] Window controls (minimize, maximize, close) work
- [ ] Update banner appears when update available
- [ ] No console errors in DevTools

### Platform Testing

Test on as many platforms as possible:
- Windows 10/11
- macOS (Intel & Apple Silicon)
- Ubuntu/Fedora/Arch Linux

## 📥 Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, focused commits
3. **Run quality checks**:
   ```bash
   npm run lint
   npm run typecheck
   ```
4. **Test manually** on your platform
5. **Update documentation** if needed
6. **Push and open PR** with:
   - Clear title and description
   - Reference related issues
   - Screenshots for UI changes
   - Test results

### PR Requirements

- [ ] All CI checks pass
- [ ] No linting errors
- [ ] TypeScript compiles without errors
- [ ] Changes are focused and atomic
- [ ] Documentation updated if needed
- [ ] No breaking changes without discussion

## 🚀 Release Process

Releases are automated via GitHub Actions:

1. Create and push a version tag: `git tag v1.2.3 && git push origin v1.2.3`
2. GitHub Actions builds for all platforms
3. Artifacts are uploaded to GitHub Release
4. Release notes are auto-generated
5. Auto-updater notifies users

### Versioning

Follow [Semantic Versioning](https://semver.org/):
- `MAJOR` - Breaking changes
- `MINOR` - New features (backward compatible)
- `PATCH` - Bug fixes (backward compatible)

## 🐛 Reporting Issues

Use the [issue tracker](https://github.com/AIONEXT/monitor-controller/issues) with:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Platform, OS version, monitor model
- Screenshots/logs if applicable

## 💬 Getting Help

- GitHub Discussions for questions
- GitHub Issues for bugs/features
- Check existing issues before creating new ones

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.