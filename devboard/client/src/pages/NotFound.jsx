import React from "react";
import { Link } from "react-router-dom";
import {useEffect, useState} from "react";

const NotFound = () => {
    const messages = [
    "Looks like this got deleted 💀",
    "Lost in the backlog for fr fr 😭",
    "This page ghosted us 👻",
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg-primary)] text-center p-8">
      <span className="text-6xl mb-4 animate-bounce">🗂️</span>
      <h2 className="text-3xl font-bold text-[#f0f0f0] mb-3">
          Lost in the backlog?
   </h2>

    <p>
      {messages[messageIndex]}
    </p>
      
      <Link
        to="/"
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
