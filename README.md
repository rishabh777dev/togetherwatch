# TogetherWatch 🎬

A modern, real-time web application built for watching content together synchronously with friends. Experience seamless synchronized playback and real-time interactions, powered by Next.js and WebSockets.

## 🌟 Features

- **Real-Time Synchronization**: Watch content seamlessly with sub-second synchronization powered by WebSockets.
- **Modern User Interface**: A stunning, responsive design built with Tailwind CSS and Framer Motion for dynamic animations.
- **State Management**: Efficient global state handling using Zustand.
- **Database Backend**: Integrated with Supabase for robust, scalable data persistence.
- **Full-Stack Next.js**: Utilizing the latest features of Next.js 15 App Router for optimal performance.

## 🚀 Tech Stack

- **Frontend Framework**: [Next.js 15](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/)
- **Real-time Communication**: Custom WebSocket Server (`ws`)
- **Language**: TypeScript

## 📂 Project Structure

- `src/`: Next.js frontend code (Components, Pages, App Router)
- `server/ws-server.js`: Custom WebSocket server for real-time video synchronization.
- `.env` & `.env.local`: Environment configuration files.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd togetherwatch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add any required environment variables (e.g., Supabase URL and Keys).

### Running the Application

TogetherWatch runs on two concurrently operating servers:

1. **Start the Next.js frontend**:
   ```bash
   npm run dev
   ```

2. **Start the WebSocket server**:
   In a separate terminal, run:
   ```bash
   npm run server
   ```

Your frontend will be running at `http://localhost:3000`.

## 📜 Available Scripts

- `npm run dev` - Starts the Next.js development server.
- `npm run server` - Starts the WebSocket server.
- `npm run build` - Builds the application for production.
- `npm run start` - Starts the production server.
- `npm run lint` - Runs ESLint for code formatting and standardizing.

## ✨ Future Enhancements

- In-app text and voice chat.
- Support for multiple streaming platforms.
- Individual user profiles and friend lists.
- Detailed room access controls.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
