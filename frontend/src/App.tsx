import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { BacklogPage } from "./pages/BacklogPage";
import { BoardPage } from "./pages/BoardPage";
import { ClosedTicketsPage } from "./pages/ClosedTicketsPage";
import { ComponentsShowcase } from "./pages/ComponentsShowcase";
import { JoinProjectPage } from "./pages/JoinProjectPage";
import { LoadingPage } from "./pages/LoadingPage";
import { LoginPage } from "./pages/LoginPage";
import { MemberProfilePage } from "./pages/MemberProfilePage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProjectHomePage } from "./pages/ProjectHomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { RaiseTicketPage } from "./pages/RaiseTicketPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SolvedIssuesPage } from "./pages/SolvedIssuesPage";
import { TeamPage } from "./pages/TeamPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<LoadingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/join" element={<JoinProjectPage />} />
          <Route path="/projects/:projectId" element={<ProjectHomePage />} />
          <Route path="/projects/:projectId/board" element={<BoardPage />} />
          <Route path="/projects/:projectId/backlog" element={<BacklogPage />} />
          <Route path="/projects/:projectId/closed" element={<ClosedTicketsPage />} />
          <Route path="/projects/:projectId/solved" element={<SolvedIssuesPage />} />
          <Route path="/projects/:projectId/team" element={<TeamPage />} />
          <Route path="/projects/:projectId/team/:userId" element={<MemberProfilePage />} />
          <Route path="/issues/new" element={<RaiseTicketPage />} />
          <Route path="/issues/:issueId" element={<TicketDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/dev/components" element={<ComponentsShowcase />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
