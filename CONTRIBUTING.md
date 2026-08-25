# Contributing to DevBoard 🎉

Thanks for taking the time to contribute! Whether it's a bug fix, a new feature, or a typo fix in the docs, every contribution matters. Here's how to get started.

## 🐛 Found a bug?

Open an issue with the `bug` label. Please include:

* What you expected to happen
* What actually happened
* Steps to reproduce it

The more detail you give, the faster it can get fixed.

## 💡 Have an idea?

Open an issue with the `enhancement` label before you start building. Let's discuss the idea first — this saves you from spending time on something that might not fit the project's direction, and helps us shape it together.

## 🙋 Want to claim an issue?

Comment on the issue you'd like to work on and we'll assign it to you. Please avoid opening a PR for an issue that's already assigned to someone else — check the issue's assignee first.

## 🛠️ Want to code?

1. Fork this repo
2. Create your branch

git checkout -b feature/your-feature-name


3. Make your changes
4. Commit using conventional commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) format so history stays easy to read:

git commit -m "feat: add dark mode toggle"
git commit -m "fix: pomodoro timer reset bug"
git commit -m "docs: update setup guide"


5. Push your branch and open a Pull Request

Describe what you changed and why. Link the related issue if there is one.

## 📋 Good First Issues (start here!)

New to the project? Look for issues labeled `good first issue` — these are scoped to be approachable for first-time contributors. Some examples of the kind of tasks you'll find:

* Add due dates to task cards
* Dark mode toggle
* Drag to reorder columns
* Add comments to tasks
* Sound alert when the Pomodoro timer ends
* Mobile-responsive layout

## 🏗️ Local Setup

git clone https://github.com/YOUR_USERNAME/devboard.git
cd devboard
npm run install:all
cp .env.example server/.env # fill in your MongoDB URI and JWT secret
npm run dev


Once running, the frontend is at `http://localhost:5173` and the backend API at `http://localhost:5000`.

No local MongoDB? Use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster instead — it takes about 2 minutes to set up and gives you a connection string to paste into `server/.env`.

> 💡 **Working on a frontend-only issue** (UI, styling, components, layout)? You don't need the backend or a MongoDB URI at all — just run the client:
> ```
> cd client
> npm install
> npm run dev
> ```
> You'll only need the full backend setup if your issue touches API routes, auth, or data persistence.

## 🪟 Windows Setup

If you're on Windows, use Git Bash or WSL for the best experience.

### Clone

```bash
git clone https://github.com/YOUR_USERNAME/devboard.git
cd devboard/devboard
```

### Install dependencies

```bash
npm run install:all
```

### Copy environment file

```bash
cp server/.env.example server/.env
```

### Run

```bash
npm run dev
```

Common Windows issues:

- Use Git Bash, not CMD.
- If port 5000 is busy, run `netstat -ano | findstr :5000`.
- If you run into MongoDB path issues, use MongoDB Atlas instead.

## 📐 Code Style

To keep the codebase consistent, please follow these conventions:

* Functional React components only — no class components
* Style with Tailwind, not custom CSS files
* Keep components small and focused on one responsibility
* Use `async/await` — avoid `.then()` chains

## ✅ PR Checklist

Before opening your Pull Request, make sure:

* [ ] My code follows the project's style guidelines
* [ ] I tested my changes locally
* [ ] I updated the README if my changes affect setup or usage
* [ ] My commit messages are clear and follow the conventional commit format

## 🔎 What happens after I open a PR?

I'll review PRs within a few days. I may leave comments or request small changes — that's normal, don't sweat it! Once everything looks good, it'll get merged. 🎉

---

Thank you for contributing — every PR, issue, and suggestion helps make DevBoard better for everyone! 🚀
