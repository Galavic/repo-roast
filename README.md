# Repo Roast

[![npm version](https://img.shields.io/npm/v/repo-roast-cli.svg)](https://www.npmjs.com/package/repo-roast-cli)
[![npm downloads](https://img.shields.io/npm/dm/repo-roast-cli.svg)](https://www.npmjs.com/package/repo-roast-cli)
[![CI](https://github.com/Galavic/repo-roast/actions/workflows/ci.yml/badge.svg)](https://github.com/Galavic/repo-roast/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/repo-roast-cli.svg)](LICENSE)
[![node](https://img.shields.io/node/v/repo-roast-cli.svg)](package.json)

Find out why people are not starring, installing, or contributing to your repo.

Repo Roast is a tiny CLI that audits a local repository for **star readiness**: demo clarity, setup experience, trust signals, and contributor friendliness. It is not trying to be another generic security scanner. It looks at the first things humans judge before they decide whether your project is worth their time.

![Repo Roast terminal demo](docs/demo.gif)

```bash
npx repo-roast-cli .
```

```bash
npx repo-roast-cli fix . --dry-run
```

```txt
Repo Roast: my-project
Star Readiness 57/145  Grade: F

Scoreboard
  Demo clarity                [###########-----] 27/40
  Setup experience            [#########-------] 19/35
  Trust signals               [----------------] 0/45
  Contributor friendliness    [#######---------] 11/25

Roasts
  [FAIL] Missing license (0/15)
     No license means users cannot safely use the project. That is a star repellent.
     Fix: Add an OSI-approved license such as MIT or Apache-2.0.
```

## Why

Most repository scanners answer: "Is this project technically healthy?"

Repo Roast asks a more painful question:

> Would a stranger understand, trust, try, and star this repo in under one minute?

## Checks

- README presence and usefulness
- Visual demo or screenshot
- Copy-paste quickstart command
- Install/setup instructions
- Package entry points and scripts
- License
- GitHub Actions
- Security policy
- Contributing guide
- Issue templates
- Code of Conduct
- Environment variable examples
- Obvious hardcoded secret patterns

## Usage

```bash
repo-roast .
repo-roast ../my-library
repo-roast . --json
repo-roast . --no-color
```

## Fix Mode

Repo Roast can also generate safe launch files for common issues:

```bash
repo-roast fix . --dry-run
repo-roast fix .
```

Fix mode creates missing files without overwriting existing ones:

- `.env.example` from detected environment variables
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.github/workflows/ci.yml`
- Issue templates
- `CODE_OF_CONDUCT.md`

## Development

```bash
npm install
npm run build
npm test
npm run roast
```

## Roadmap

- GitHub URL mode using the GitHub API
- Markdown report export for pull requests
- Custom rules through `repo-roast.config.json`
- Badge generator for README score

## License

MIT
