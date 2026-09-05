# 🗂️ DevBoard — Kanban for Developers
 
> An open-source Kanban board built specifically for developers — with code snippets inside tasks, GitHub issue sync, and a built-in Pomodoro timer.
 
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Made with MERN](https://img.shields.io/badge/Stack-MERN-blue.svg)](#-tech-stack)
 
DevBoard is a task board made for how developers actually work — track issues, drop in code snippets without leaving the task, pull in GitHub issues automatically, and stay focused with a built-in Pomodoro timer.
 
---
 
## ✨ Features
 
- 📋 **Drag & Drop Kanban** — Move tasks through Backlog → In Progress → Review → Done
- 💻 **Code Snippets in Tasks** — Attach syntax-highlighted code directly to any task
- 🔗 **GitHub Issue Sync** — Import issues from a GitHub repo as tasks automatically
- 🍅 **Pomodoro Timer** — Built-in 25/5 min work-break timer for each task
- 🔐 **Auth** — Register and log in securely with JWT
- 🌙 **Dark Mode UI** — Easy on the eyes during long coding sessions
--
<img width="893" height="608" alt="Screenshot 2026-06-06 095817" src="https://github.com/user-attachments/assets/a3ee8e4e-026b-4f8f-be2e-d0a2f436810c" />
<img width="893" height="608" alt="DevBoard screenshot" src="./docs/screenshot.png" />

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Create a new task |
| `Esc` | Close the open modal |

> `N` is disabled while typing in an input or textarea, so it won't interrupt you mid-sentence.

---
 
## 🛠️ Tech Stack
 
| Layer     | Tech                        |
|-----------|------------------------------|
| Frontend  | React 18 + Vite + Tailwind   |
| Backend   | Node.js + Express            |
| Database  | MongoDB + Mongoose           |
| Auth      | JWT + bcryptjs                |
| Drag & Drop | @hello-pangea/dnd           |
 
---
 
## ⚡ Quick Start
 
### Prerequisites
 
Before you begin, make sure you have:
 
- **Node.js** v18 or higher installed
- A **MongoDB** database — either a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or a local MongoDB instance
### 1. Clone the repository
 
```bash
git clone https://github.com/YOUR_USERNAME/devboard.git
cd devboard
```
 
### 2. Install dependencies
 
This installs dependencies for both the frontend and backend in one step:
 
```bash
npm run install:all
```
 
### 3. Set up environment variables
 
Copy the example environment file and fill in your own values:
 
```bash
cp .env.example server/.env
```
 
Then open `server/.env` and add your MongoDB connection string and a JWT secret.
 
### 4. Run the app
 
This starts both the frontend and backend at once:
 
```bash
npm run dev
```
 
Once it's running, you can access:
 
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
---
 
## 🤝 Contributing
 
Contributions are very welcome, and this project is friendly to first-time contributors!
 
Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for the full setup and contribution guide. If you're not sure where to start, look for issues labeled `good first issue`.
 
---
![alt text](<screenshot.png .png>)
src="./docs/screenshot.png"
