import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BoardProvider, useBoard } from "./context/BoardContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const PrivateRoute = ({ children }) => {
  const { user } = useBoard();
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <BoardProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </BoardProvider>
);

export default App;
