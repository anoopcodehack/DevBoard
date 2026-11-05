import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BoardProvider, useBoard } from "./context/BoardContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import TaskPage from "./pages/TaskPage";
import Analytics from "./pages/Analytics";
import OfflineBanner from "./components/common/OfflineBanner";

const PrivateRoute = ({ children }) => {
  const { user } = useBoard();
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>}/>
    <Route path="/task/:id" element={<PrivateRoute><TaskPage /></PrivateRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <BoardProvider>
    <OfflineBanner />
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer position="bottom-right" theme="dark" autoClose={2000} />
    </BrowserRouter>
  </BoardProvider>
);

export default App;
